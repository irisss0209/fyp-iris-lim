import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  CameraIcon,
  XIcon,
  ArrowLeftIcon,
  MapPinIcon,
  Loader2
} from 'lucide-react';

import { detectNearbyStations } from '../../utils/location';

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
  const [station, setStation] = useState('');
  const [coach, setCoach] = useState('');
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyStations, setNearbyStations] = useState<any[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  const [linesData, setLinesData] = useState<any[]>([]);
  const [stationsData, setStationsData] = useState<any[]>([]);

  const handleDetectLocation = () => {
    setNearbyStations([]);
    detectNearbyStations(
      setIsLocating,
      (data) => setNearbyStations(data),
      (msg) => alert(msg)
    );
  };

  useEffect(() => {
    fetch('http://localhost:5293/api/data/lines')
      .then(res => res.json())
      .then(setLinesData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedLineId) {
      fetch(`http://localhost:5293/api/data/stations-by-line/${selectedLineId}`)
        .then(res => res.json())
        .then(setStationsData)
        .catch(console.error);
    } else {
      setStationsData([]);
    }
  }, [selectedLineId]);

  const selectedLineData = linesData.find(l => l.lineName === line);
  const availableCoaches = selectedLineData?.coaches || [];

  const inputClass = (field: string) =>
    `w-full px-3.5 py-3 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors[field]
      ? 'border-red-300 bg-red-50 focus:ring-red-200'
      : 'border-gray-200 bg-gray-50 focus:ring-[#0B4F6C]/20 focus:border-[#0B4F6C]'
    } text-gray-800 font-medium`;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!line) newErrors.line = 'Please select a line';
    if (!station) newErrors.station = 'Please select a station';
    if (!coach) newErrors.coach = 'Please enter coach ID (or "Unknown")';
    if (!desc) newErrors.desc = 'Please describe what is happening';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
          station,
          coach,
          type,
          desc,
          lineId: selectedLineId,
          stationId: selectedStationId
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
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-900">Report a Violation</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Fields marked with <span className="text-red-400">*</span> are required
          </p>
        </div>
        <button
          onClick={handleDetectLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EBF4F8] text-[#0B4F6C] text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          {isLocating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <MapPinIcon size={14} />
          )}
          {isLocating ? 'Locating...' : 'Near Me'}
        </button>
      </div>

      {nearbyStations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#EBF4F8] border border-[#0B4F6C]/10 rounded-2xl p-3.5"
        >
          <p className="text-[10px] font-bold text-[#0B4F6C] uppercase tracking-wider mb-2">Closest Stations</p>
          <div className="flex flex-wrap gap-2">
            {nearbyStations.map((s) => (
              <button
                key={s.stationId}
                onClick={() => {
                  if (s.lines && s.lines.length > 0) {
                    const firstLine = s.lines[0];
                    setLine(firstLine.name);
                    setStation(s.stationName);
                    setCoach('');
                    setErrors(v => ({ ...v, line: '', station: '' }));
                    
                    // NEW: Track the specific station and line IDs
                    setSelectedStationId(s.stationId);
                    setSelectedLineId(firstLine.id);
                  }
                }}
                className="bg-white border border-[#0B4F6C]/20 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0B4F6C] shadow-sm active:bg-[#0B4F6C] active:text-white transition-colors"
              >
                {s.stationName} <span className="text-[10px] font-normal opacity-60">({(s.distance).toFixed(1)}km)</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#0B4F6C]/60 mt-2 italic">Tap to select the train line for this station.</p>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">

        {/* Train Line */}
        <div>
          <FieldLabel required>Train Line</FieldLabel>
          <select
            value={line}
            onChange={e => { 
              setLine(e.target.value); 
              setCoach(''); 
              setErrors(v => ({ ...v, line: '' }));
              // Reset nearby IDs if manually choosing
              setSelectedStationId(null);
              setSelectedLineId(linesData.find(l => l.lineName === e.target.value)?.lineId || null);
            }}
            className={inputClass('line')}
            disabled={linesData.length === 0}
          >
            <option value="">Select line</option>
            {linesData.map(l => <option key={l.lineId} value={l.lineName}>{l.lineName}</option>)}
          </select>
          {errors.line && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.line}</p>}
        </div>

        <div>
          <FieldLabel required>Station</FieldLabel>
          <select
            value={station}
            onChange={e => {
              setStation(e.target.value);
              setErrors(v => ({ ...v, station: '' }));
              setSelectedStationId(stationsData.find(s => s.stationName === e.target.value)?.stationId || null);
            }}
            className={inputClass('station')}
            disabled={!line || stationsData.length === 0}
          >
            <option value="">Select station</option>
            {stationsData.map(s => <option key={s.stationId} value={s.stationName}>{s.stationName}</option>)}
          </select>
          {errors.station && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.station}</p>}
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
