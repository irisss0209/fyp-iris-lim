import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  SendIcon,
  CameraIcon,
  XIcon,
} from 'lucide-react';

const LINES = ['LRT Kelana Jaya', 'KTM Komuter', 'MRT Putrajaya', 'MRT Kajang'];
const COACHES = ['Coach 1', 'Coach 2', 'Coach 3', 'Coach 4', 'Coach 5', 'Coach 6'];
const VIOLATION_TYPES = [
  'Male in Women-Only Coach',
  'Harassment / Inappropriate Behaviour',
  'Suspicious Package / Item',
  'Vandalism',
  'Fare Evasion',
  'Other',
];

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

export function Report() {
  const [step, setStep] = useState<'form' | 'sent'>('form');
  const [line, setLine] = useState('');
  const [coach, setCoach] = useState('');
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const inputClass = (field: string) =>
    `w-full px-3.5 py-3 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors[field]
      ? 'border-red-300 bg-red-50 focus:ring-red-200'
      : 'border-gray-200 bg-gray-50 focus:ring-[#0B4F6C]/20 focus:border-[#0B4F6C]'
    } text-gray-800 font-medium`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!line) e.line = 'Please select a train line.';
    if (!coach) e.coach = 'Please select a coach.';
    if (!type) e.type = 'Please select a violation type.';
    if (!desc.trim()) e.desc = 'Please describe the incident.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setStep('sent');
    setTimeout(() => {
      setStep('form');
      setLine(''); setCoach(''); setType(''); setDesc(''); setPhoto(null); setErrors({});
    }, 3000);
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
      key="report"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="px-4 pt-5 pb-6 space-y-4"
    >
      <div>
        <h2 className="text-base font-bold text-gray-900">Report a Violation</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Fields marked with <span className="text-red-400">*</span> are required
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">

        {/* Train Line */}
        <div>
          <FieldLabel required>Train Line</FieldLabel>
          <select
            value={line}
            onChange={e => { setLine(e.target.value); setErrors(v => ({ ...v, line: '' })); }}
            className={inputClass('line')}
          >
            <option value="">Select line…</option>
            {LINES.map(l => <option key={l}>{l}</option>)}
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
          >
            <option value="">Select coach…</option>
            {COACHES.map(c => <option key={c}>{c}</option>)}
          </select>
          {errors.coach && <p className="text-xs text-red-500 mt-1">{errors.coach}</p>}
        </div>

        {/* Violation Type */}
        <div>
          <FieldLabel required>Violation Type</FieldLabel>
          <select
            value={type}
            onChange={e => { setType(e.target.value); setErrors(v => ({ ...v, type: '' })); }}
            className={inputClass('type')}
          >
            <option value="">Select type…</option>
            {VIOLATION_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
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
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-[0.98] transition-all"
        style={{ backgroundColor: '#0B4F6C' }}
      >
        <SendIcon size={15} />
        Submit Report
      </button>
    </motion.div>
  );
}
