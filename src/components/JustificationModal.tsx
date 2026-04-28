import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {

  XIcon,

} from 'lucide-react';
interface JustificationModalProps {
  isOpen: boolean;
  actionType: 'verify' | 'dismiss' | 'escalate' | 'en_route' | 'resolve';
  alertId: string;
  alertCoach: number | string;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
  isOptional?: boolean;
}
const QUICK_REASONS_VERIFY = [
  'Unauthorized male passenger in women’s coach',
  'Violation confirmed via CCTV',
  'Passenger report verified',
  'Repeated violation observed'
];

const QUICK_REASONS_DISMISS = [
  'No violation — passenger permitted in coach',
  'Male child accompanied by female passenger',
  'PWD passenger allowed in coach',
  'Staff member on duty',
  'Incorrect detection — no issue observed',
  'Duplicate or already handled alert'
];

const QUICK_REASONS_ESCALATE = [
  'Unauthorized passenger refuses to leave',
  'Potential safety risk to passengers',
  'Repeated violations detected',
  'Assistance required from auxiliary staff'
];

const QUICK_REASONS_EN_ROUTE = [
  'Assigned to handle this alert',
  'En route to manage unauthorized passenger',
  'Responding to verified violation',
  'Proceeding to assist with safety concern'
];

const QUICK_REASONS_RESOLVE = [
  'Passenger complied and moved to appropriate coach',
  'Male passenger accompanied by female family member',
  'PWD passenger assisted and relocated',
  'Alert resolved by station staff',
  'No further issues observed after intervention'
];

export function JustificationModal({
  isOpen,
  actionType,
  alertId,
  alertCoach,
  onConfirm,
  onCancel,
  isOptional = false
}: JustificationModalProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isVerify = actionType === 'verify';
  const isEscalate = actionType === 'escalate';
  const isEnRoute = actionType === 'en_route';
  const isResolve = actionType === 'resolve';

  const accentColor = (isVerify || isResolve) ? '#2D7A5D' : isEscalate ? '#7B5EA7' : isEnRoute ? '#0B4F6C' : '#D34026';
  const quickReasons = isVerify ? QUICK_REASONS_VERIFY : isEscalate ? QUICK_REASONS_ESCALATE : isEnRoute ? QUICK_REASONS_EN_ROUTE : isResolve ? QUICK_REASONS_RESOLVE : QUICK_REASONS_DISMISS;
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setComment('');
      setError(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);
  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);
  const handleConfirm = () => {
    if (!isOptional && !comment.trim()) {
      setError(true);
      textareaRef.current?.focus();
      return;
    }
    onConfirm(comment.trim());
    setComment('');
    setError(false);
  };
  const handleQuickReason = (reason: string) => {
    setComment(reason);
    setError(false);
    textareaRef.current?.focus();
  };
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onCancel}
        aria-hidden="true" />


      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden"
        style={{
          boxShadow: '0 20px 48px rgba(0,0,0,0.15)'
        }}>

        {/* Header stripe */}
        <div
          className="h-1 w-full"
          style={{
            backgroundColor: accentColor
          }}
          aria-hidden="true" />


        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5">

            <div>
              <h2
                id="modal-title"
                className="text-base font-bold text-gray-900 leading-tight">

                {isVerify ? 'Verify Alert' : isEscalate ? 'Escalate Alert' : isEnRoute ? 'En Route to Alert' : isResolve ? 'Resolve Alert' : 'Dismiss Alert'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {alertCoach} · {alertId}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close modal">

            <XIcon size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          {/* Quick reasons */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Quick reasons
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickReasons.map((reason) =>
                <button
                  key={reason}
                  onClick={() => handleQuickReason(reason)}
                  className={`
                    text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors
                    ${comment === reason ? 'border-transparent text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}
                  `}
                  style={
                    comment === reason ?
                      {
                        backgroundColor: accentColor,
                        borderColor: accentColor
                      } :
                      {}
                  }>

                  {reason}
                </button>
              )}
            </div>
          </div>

          {/* Comment textarea */}
          <div>
            <label
              htmlFor="justification-comment"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">

              {isOptional ? 'Optional Comment' : 'Justification comment'}
              {!isOptional && (
                <span className="text-red-400" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            <textarea
              ref={textareaRef}
              id="justification-comment"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (e.target.value.trim()) setError(false);
              }}
              placeholder={
                isVerify ? 'Describe why this alert is being verified...' :
                  isEscalate ? 'Describe why this alert needs escalation...' :
                    isEnRoute ? 'Add any notes before routing...' :
                      isResolve ? 'Describe how this was resolved...' :
                        'Describe why this alert is being dismissed...'
              }
              rows={3}
              className={`
                w-full text-sm text-gray-800 placeholder-gray-400 bg-gray-50
                border rounded-xl px-3.5 py-3 resize-none
                focus:outline-none focus:ring-2 focus:bg-white transition-colors
                ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-teal-100'}
              `}
              style={
                error ?
                  {} :
                  {
                    '--tw-ring-color': `${accentColor}33`
                  } as React.CSSProperties
              }
              aria-required="true"
              aria-invalid={error}
              aria-describedby={error ? 'comment-error' : undefined} />

            {error &&
              <p
                id="comment-error"
                className="text-xs text-red-500 mt-1.5 flex items-center gap-1"
                role="alert">

                <span aria-hidden="true">⚠</span>A justification comment is
                required before proceeding.
              </p>
            }
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">

              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90 active:opacity-80"
              style={{
                backgroundColor: accentColor
              }}>

              {isVerify ? 'Confirm Verify' : isEscalate ? 'Confirm Escalate' : isEnRoute ? 'Confirm En Route' : isResolve ? 'Confirm Resolve' : 'Confirm Dismiss'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}