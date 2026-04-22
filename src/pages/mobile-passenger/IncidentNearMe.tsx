import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangleIcon, ClockIcon, MapPinIcon, RadioIcon } from 'lucide-react';

export function IncidentNearMe() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5293/api/data/incident-near-me')
      .then(res => res.json())
      .then(data => {
        setIncidents(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch incidents near me', err);
        setLoading(false);
      });
  }, []);

  return (
    <motion.div
      key="incident-near-me"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="px-4 pt-5 pb-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
          <RadioIcon size={18} className="animate-pulse" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Active Incidents</h2>
          <p className="text-xs text-gray-400 mt-0.5">Happening right now</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium">Scanning for active incidents...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-900">All Clear</p>
          <p className="text-xs text-gray-400 mt-1 max-w-[200px]">There are currently no active violations reported.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <div key={inc.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100">


              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm text-gray-900">{inc.type}</h3>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 capitalize">
                    {inc.status?.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <MapPinIcon size={13} className="text-gray-400" />
                    {inc.line} - {inc.coach}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium ml-auto">
                    <ClockIcon size={13} className="text-gray-400" />
                    {inc.time}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
