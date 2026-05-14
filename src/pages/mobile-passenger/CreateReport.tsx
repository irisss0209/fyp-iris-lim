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
import { UserSession } from '../../types/session';

interface LineData { lineId: string; lineName: string; coaches?: number[]; trains?: number[] }
interface StationData { stationId: string; stationName: string }
interface NearbyStation {
  stationId: string; stationName: string; distance: number;
  lines: { id: string; name: string; trainId?: number }[];
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

export function CreateReport({ session, onBack }: { session: UserSession, onBack: () => void }) {
  const [step, setStep] = useState<'form' | 'sent' | 'sending' | 'queued'>('form');
  const [form, setForm] = useState({
    line: '', station: '', coach: '', type: '', desc: '', trainNumber: '',
    selectedStationId: null as string | null,
    selectedLineId: null as string | null,
    selectedTrainId: 0,
    selectedCoachId: 0,
  });
  const setF = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([]);
  const [showSampleImage, setShowSampleImage] = useState(false);

  const [linesData, setLinesData] = useState<LineData[]>([]);
  const [stationsData, setStationsData] = useState<StationData[]>([]);

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
    fetch(`${import.meta.env.VITE_API_BASE}/api/data/lines`, { credentials: 'include' })
      .then(res => res.json())
      .then(setLinesData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (form.selectedLineId) {
      fetch(`${import.meta.env.VITE_API_BASE}/api/data/stations-by-line/${form.selectedLineId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(setStationsData)
        .catch(console.error);
    } else {
      setStationsData([]);
    }
  }, [form.selectedLineId]);

  const selectedLineData = linesData.find(l => l.lineName === form.line);
  const availableCoaches = selectedLineData?.coaches || [];
  const availableTrains = selectedLineData?.trains || [];

  const inputClass = (field: string) =>
    `w-full px-3.5 py-3 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors[field]
      ? 'border-red-300 bg-red-50 focus:ring-red-200'
      : 'border-gray-200 bg-gray-50 focus:ring-[#0B4F6C]/20 focus:border-[#0B4F6C]'
    } text-gray-800 font-medium`;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.line) newErrors.line = 'Please select a line';
    if (!form.station) newErrors.station = 'Please select a station';
    if (!form.trainNumber.trim()) newErrors.trainNumber = 'Please select a train number';
    if (!form.coach) newErrors.coach = 'Please enter coach ID (or "Unknown")';
    if (!form.desc) newErrors.desc = 'Please describe what is happening';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const registerBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await (reg as any).sync.register('flush-reports');
      } catch { /* background sync not supported, online flush will handle it */ }
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep('sending');

    const { line, station, coach, trainNumber, type, desc, selectedTrainId, selectedCoachId, selectedLineId, selectedStationId } = form;
    const reportPayload = {
      line, station, coach, trainNumber,
      trainId: selectedTrainId,
      coachId: selectedCoachId,
      type, desc,
      lineId: selectedLineId,
      stationId: selectedStationId,
    };

    if (!navigator.onLine) {
      await queueReport(session.userId, reportPayload, photoFile);
      await registerBackgroundSync();
      setStep('queued');
      setTimeout(() => onBack(), 3000);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/data/report`, {
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
              `${import.meta.env.VITE_API_BASE}/api/data/report/${reportId}/image`,
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
    } catch {
      await queueReport(session.userId, reportPayload, photoFile);
      await registerBackgroundSync();
      setStep('queued');
      setTimeout(() => onBack(), 3000);
    }
  };

  if (step === 'sent' || step === 'queued') {
    const isQueued = step === 'queued';
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">

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
              s.lines.map((lineEntry) => (
                <button
                  key={`${s.stationId}-${lineEntry.id}`}
                  onClick={() => {
                    setForm(f => ({ ...f,
                      line: lineEntry.name, station: s.stationName, coach: '',
                      selectedStationId: s.stationId, selectedLineId: lineEntry.id,
                      selectedTrainId: lineEntry.trainId ?? 0, selectedCoachId: 0,
                    }));
                    setErrors(v => ({ ...v, line: '', station: '' }));
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
            value={form.line}
            onChange={e => {
              const selected = linesData.find(l => l.lineName === e.target.value);
              setForm(f => ({ ...f,
                line: e.target.value, coach: '', trainNumber: '',
                selectedStationId: null, selectedLineId: selected?.lineId || null,
                selectedTrainId: 0, selectedCoachId: 0,
              }));
              setErrors(v => ({ ...v, line: '' }));
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
            value={form.station}
            onChange={e => {
              setForm(f => ({ ...f, station: e.target.value, selectedStationId: stationsData.find(s => s.stationName === e.target.value)?.stationId || null }));
              setErrors(v => ({ ...v, station: '' }));
            }}
            className={inputClass('station')}
            disabled={!form.line || stationsData.length === 0}
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
            value={form.trainNumber}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, trainNumber: val, selectedTrainId: parseInt(val, 10) || 0 }));
              setErrors(v => ({ ...v, trainNumber: '' }));
            }}
            className={inputClass('trainNumber')}
            disabled={!form.line || availableTrains.length === 0}
          >
            <option value="">{!form.line ? 'Select a line first…' : 'Select train…'}</option>
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
            value={form.coach}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, coach: val, selectedCoachId: parseInt(val, 10) }));
              setErrors(v => ({ ...v, coach: '' }));
            }}
            className={inputClass('coach')}
            disabled={!form.line || availableCoaches.length === 0}
          >
            <option value="">{!form.line ? 'Select a line first…' : 'Select coach…'}</option>
            {availableCoaches.map((c: number) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.coach && <p className="text-xs text-red-500 mt-1">{errors.coach}</p>}
        </div>

        {/* Description */}
        <div>
          <FieldLabel required>Description</FieldLabel>
          <textarea
            value={form.desc}
            onChange={e => { setF('desc', e.target.value); setErrors(v => ({ ...v, desc: '' })); }}
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
