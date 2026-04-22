import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  CameraIcon,
  XIcon,
  ArrowLeftIcon
} from 'lucide-react';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

export function CreateReport({ session, onBack }: { session: any, onBack: () => void }) {
  const [step, setStep] = useState<'form' | 'sent' | 'sending'>('form');
  const [line, setLine] = useState('');
  const [coach, setCoach] = useState('');
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [linesData, setLinesData] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:5293/api/data/lines')
      .then(res => res.json())
      .then(data => setLinesData(data))
      .catch(err => console.error('Failed to fetch lines', err));
  }, []);

  const selectedLineData = linesData.find(l => l.lineName === line);
  const availableCoaches = selectedLineData?.coaches || [];

  const inputClass = (field: string) =>
    `w-full px-3.5 py-3 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors[field]
      ? 'border-red-300 bg-red-50 focus:ring-red-200'
      : 'border-gray-200 bg-gray-50 focus:ring-[#0B4F6C]/20 focus:border-[#0B4F6C]'
    } text-gray-800 font-medium`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!line) e.line = 'Please select a train line.';
    if (!coach) e.coach = 'Please select a coach.';
    if (!desc.trim()) e.desc = 'Please describe the incident.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep('sending');

    try {
      const response = await fetch(`http://localhost:5293/api/data/report?userId=${session.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line,
          coach,
          type,
          desc
        })
      });

      if (response.ok) {
        setStep('sent');
        setTimeout(() => {
          onBack(); // Auto-return to list when successfully finished
        }, 3000);
      } else {
        let errorMsg = 'Failed to submit report. Please try again.';
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        setErrors({ desc: errorMsg });
        setStep('form');
      }
    } catch (err) {
      console.error(err);
      setErrors({ desc: 'Network error. Please try again.' });
      setStep('form');
    }
  };

  if (step === 'sent') {
    return (
      <motion.div
        key="sent"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center px-4 py-20 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5 shadow-sm">
          <CheckCircleIcon size={40} className="text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Report Submitted</h3>
        <p className="text-sm text-gray-400 max-w-[260px] leading-relaxed">
          Authorities have been notified. Thank you for keeping our coaches safe.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="create"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="px-4 pt-5 pb-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <button 
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          <ArrowLeftIcon size={18} />
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-900">Report a Violation</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Fields marked with <span className="text-red-400">*</span> are required
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">

        {/* Train Line */}
        <div>
          <FieldLabel required>Train Line</FieldLabel>
          <select
            value={line}
            onChange={e => { setLine(e.target.value); setCoach(''); setErrors(v => ({ ...v, line: '' })); }}
            className={inputClass('line')}
            disabled={linesData.length === 0}
          >
            <option value="">{linesData.length === 0 ? 'Loading lines...' : 'Select line…'}</option>
            {linesData.map(l => <option key={l.lineId} value={l.lineName}>{l.lineName}</option>)}
          </select>
          {errors.line && <p className="text-xs text-red-500 mt-1">{errors.line}</p>}
        </div>

        {/* Coach */}
        <div>
          <FieldLabel required>Coach Number</FieldLabel>
          <select
            value={coach}
            onChange={e => { setCoach(e.target.value); setErrors(v => ({ ...v, coach: '' })); }}
            className={inputClass('coach')}
            disabled={!line || availableCoaches.length === 0}
          >
            <option value="">{!line ? 'Select a line first…' : 'Select coach…'}</option>
            <option value="Unknown">Unknown</option>
            {availableCoaches.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.coach && <p className="text-xs text-red-500 mt-1">{errors.coach}</p>}
        </div>

        {/* Description */}
        <div>
          <FieldLabel required>Description</FieldLabel>
          <textarea
            value={desc}
            onChange={e => { setDesc(e.target.value); setErrors(v => ({ ...v, desc: '' })); }}
            placeholder="Briefly describe the incident…"
            rows={4}
            className={`${inputClass('desc')} resize-none`}
          />
          {errors.desc && <p className="text-xs text-red-500 mt-1">{errors.desc}</p>}
        </div>

        {/* Photo – optional */}
        <div>
          <FieldLabel>
            Photo <span className="text-gray-400 font-normal normal-case ml-1">(Optional)</span>
          </FieldLabel>
          {!photo ? (
            <button
              onClick={() => setPhoto('attached')}
              className="w-full py-7 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-gray-100 active:bg-gray-100 transition-colors"
            >
              <CameraIcon size={22} />
              <span className="text-xs font-medium">Tap to attach photo</span>
            </button>
          ) : (
            <div className="relative w-full h-28 rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
              <img
                src="https://images.unsplash.com/photo-1599395191060-e10eb96eb678?q=80&w=600&auto=format&fit=crop"
                alt="Attached"
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-semibold drop-shadow">Photo attached</span>
              </div>
              <button
                onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
              >
                <XIcon size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={step === 'sending'}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-75"
        style={{ backgroundColor: '#0B4F6C' }}
      >
        {step === 'sending' ? 'Submitting...' : 'Submit Report'}
      </button>
    </motion.div>
  );
}
