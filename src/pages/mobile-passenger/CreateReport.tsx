import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircleIcon,
  CameraIcon,
  XIcon,
  ArrowLeftIcon,
  MapPinIcon,
  Loader2,
  ImageIcon,
} from 'lucide-react';

import { detectNearbyStations } from '../../utils/location';
import { queueReport } from '../../utils/offlineQueue';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

export function CreateReport({ session, onBack }: { session: any, onBack: () => void }) {
  const [step, setStep] = useState<'form' | 'sent' | 'sending' | 'queued'>('form');
  const [line, setLine] = useState('');
  const [station, setStation] = useState('');
  const [coach, setCoach] = useState('');
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyStations, setNearbyStations] = useState<any[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedTrainId, setSelectedTrainId] = useState<number>(0);
  const [selectedCoachId, setSelectedCoachId] = useState<number>(0);
  const [trainNumber, setTrainNumber] = useState('');
  const [showSampleImage, setShowSampleImage] = useState(false);

  const [linesData, setLinesData] = useState<any[]>([]);
  const [stationsData, setStationsData] = useState<any[]>([]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleDetectLocation = () => {
    setNearbyStations([]);
    detectNearbyStations(
      setIsLocating,
      (data) => setNearbyStations(data),
      (msg) => alert(msg)
    );
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/data/lines`, { credentials: 'include' })
      .then(res => res.json())
      .then(setLinesData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedLineId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/data/stations-by-line/${selectedLineId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(setStationsData)
        .catch(console.error);
    } else {
      setStationsData([]);
    }
  }, [selectedLineId]);

  const selectedLineData = linesData.find(l => l.lineName === line);
  const availableCoaches = selectedLineData?.coaches || [];
  const availableTrains = selectedLineData?.trains || [];

  const inputClass = (field: string) =>
    `w-full px-3.5 py-3 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors[field]
      ? 'border-red-300 bg-red-50 focus:ring-red-200'
      : 'border-gray-200 bg-gray-50 focus:ring-[#0B4F6C]/20 focus:border-[#0B4F6C]'
    } text-gray-800 font-medium`;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!line) newErrors.line = 'Please select a line';
    if (!station) newErrors.station = 'Please select a station';
    if (!trainNumber.trim()) newErrors.trainNumber = 'Please select a train number';
    if (!coach) newErrors.coach = 'Please enter coach ID (or "Unknown")';
    if (!desc) newErrors.desc = 'Please describe what is happening';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep('sending');

    const reportPayload = {
      line, station, coach, trainNumber,
      trainId: selectedTrainId,
      coachId: selectedCoachId,
      type, desc,
      lineId: selectedLineId,
      stationId: selectedStationId,
    };

    if (!navigator.onLine) {
      queueReport(session.userId, reportPayload);
      setStep('queued');
      setTimeout(() => onBack(), 3000);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/data/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.token && { Authorization: `Bearer ${session.token}` }),
        },
        body: JSON.stringify(reportPayload),
        credentials: 'include'
      });

      if (response.ok) {
        const { reportId } = await response.json();

        // Upload photo if one was selected
        if (photoFile && reportId) {
          const form = new FormData();
          form.append('image', photoFile);
          try {
            await fetch(
              `${import.meta.env.VITE_API_URL}/api/data/report/${reportId}/image`,
              {
                method: 'POST',
                headers: { ...(session.token && { Authorization: `Bearer ${session.token}` }) },
                body: form,
                credentials: 'include'
              }
            );
          } catch (err) {
            console.error('Image upload failed:', err);
            // Image upload failure is non-fatal — report is already saved
          }
        }

        setStep('sent');
        setTimeout(() => onBack(), 3000);
      } else {
        let errorMsg = 'Failed to submit report. Please try again.';
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch { }
        setErrors({ desc: errorMsg });
        setStep('form');
      }
    } catch (err) {
      // Network failed mid-request — queue it
      queueReport(session.userId, reportPayload);
      setStep('queued');
      setTimeout(() => onBack(), 3000);
    }
  };

  if (step === 'sent' || step === 'queued') {
    const isQueued = step === 'queued';
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-sm ${isQueued ? 'bg-amber-50' : 'bg-green-50'}`}>
          <CheckCircleIcon size={40} className={isQueued ? 'text-amber-500' : 'text-green-500'} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {isQueued ? 'Report Saved' : 'Report Submitted'}
        </h3>
        <p className="text-sm text-gray-400 max-w-[260px] leading-relaxed">
          {isQueued
            ? "You're offline. Your report has been saved and will be submitted automatically when you reconnect."
            : 'Authorities have been notified. Thank you for keeping our coaches safe.'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
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
        <div className="bg-[#EBF4F8] border border-[#0B4F6C]/10 rounded-2xl p-3.5">
          <p className="text-[10px] font-bold text-[#0B4F6C] uppercase tracking-wider mb-2">Closest Stations</p>
          <div className="flex flex-wrap gap-2">
            {nearbyStations.flatMap((s) =>
              (s.lines && s.lines.length > 0 ? s.lines : []).map((lineEntry: any) => (
                <button
                  key={`${s.stationId}-${lineEntry.id}`}
                  onClick={() => {
                    setLine(lineEntry.name);
                    setStation(s.stationName);
                    setCoach('');
                    setErrors(v => ({ ...v, line: '', station: '' }));
                    setSelectedStationId(s.stationId);
                    setSelectedLineId(lineEntry.id);
                    setSelectedTrainId(lineEntry.trainId ?? 0);
                    setSelectedCoachId(0);
                  }}
                  className="bg-white border border-[#0B4F6C]/20 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0B4F6C] shadow-sm active:bg-[#0B4F6C] active:text-white transition-colors"
                >
                  {s.stationName}
                  <span className="text-[10px] font-normal opacity-80 ml-1">({lineEntry.name})</span>
                  <span className="text-[10px] font-normal opacity-50 ml-1">{(s.distance).toFixed(1)}km</span>
                </button>
              ))
            )}
          </div>
          <p className="text-[10px] text-[#0B4F6C]/60 mt-2 italic">Tap to select the train line for this station.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">

        {/* Train Line */}
        <div>
          <FieldLabel required>Train Line</FieldLabel>
          <select
            value={line}
            onChange={e => {
              const selected = linesData.find(l => l.lineName === e.target.value);
              setLine(e.target.value);
              setCoach('');
              setErrors(v => ({ ...v, line: '' }));
              setSelectedStationId(null);
              setSelectedLineId(selected?.lineId || null);
              setSelectedTrainId(0);
              setTrainNumber('');
              setSelectedCoachId(0);
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

        {/* ── Train Number (Car No.) ── */}
        <div>
          <FieldLabel required>Train Number (Car No.)</FieldLabel>

          <button
            type="button"
            onClick={() => setShowSampleImage(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#0B4F6C] mb-2 hover:underline"
          >
            <span>Where do I find this?</span>
            <span className="text-gray-400">{showSampleImage ? '▲ hide' : '▼ show'}</span>
          </button>

          {showSampleImage && (
            <div className="mb-3 rounded-xl overflow-hidden border border-[#0B4F6C]/20 shadow-sm relative">
              <img
                src="https://railly.s3.ap-southeast-1.amazonaws.com/assets/trainid_coachid_sample.png"
                alt="Sample sticker showing Car No. and Door No. inside the train"
                className="w-full object-cover max-h-44"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                <p className="text-white text-[10px] font-semibold leading-tight">
                  Look for this sticker on the wall above the door
                </p>
              </div>
            </div>
          )}

          <select
            value={trainNumber}
            onChange={e => {
              const val = e.target.value;
              setTrainNumber(val);
              setSelectedTrainId(parseInt(val, 10) || 0);
              setErrors(v => ({ ...v, trainNumber: '' }));
            }}
            className={inputClass('trainNumber')}
            disabled={!line || availableTrains.length === 0}
          >
            <option value="">{!line ? 'Select a line first…' : 'Select train…'}</option>
            {availableTrains.map((t: number) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.trainNumber && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.trainNumber}</p>}
        </div>

        {/* Coach */}
        <div>
          <FieldLabel required>Coach Number</FieldLabel>
          <select
            value={coach}
            onChange={e => {
              const val = e.target.value;
              setCoach(val);
              setSelectedCoachId(parseInt(val, 10));
              setErrors(v => ({ ...v, coach: '' }));
            }}
            className={inputClass('coach')}
            disabled={!line || availableCoaches.length === 0}
          >
            <option value="">{!line ? 'Select a line first…' : 'Select coach…'}</option>
            {availableCoaches.map((c: number) => <option key={c} value={c}>{c}</option>)}
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

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />

          {!photoPreview ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400 active:bg-gray-100 transition-colors"
              >
                <CameraIcon size={20} />
                <span className="text-xs font-medium">Take photo</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400 active:bg-gray-100 transition-colors"
              >
                <ImageIcon size={20} />
                <span className="text-xs font-medium">From gallery</span>
              </button>
            </div>
          ) : (
            <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full max-h-52 object-cover"
              />
              <button
                type="button"
                onClick={clearPhoto}
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
    </div>
  );
}
