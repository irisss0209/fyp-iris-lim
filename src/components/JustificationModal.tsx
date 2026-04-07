import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  XIcon,
  MessageSquareIcon } from
'lucide-react';
interface JustificationModalProps {
  isOpen: boolean;
  actionType: 'verify' | 'dismiss';
  alertId: string;
  alertCoach: string;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}
const QUICK_REASONS_VERIFY = [
'Confirmed via CCTV footage',
'Officer on-site verified',
'Multiple camera angles confirmed',
'Passenger report corroborated'];

const QUICK_REASONS_DISMISS = [
'False positive — no violation',
'AI misclassification',
'Maintenance staff, not passenger',
'Duplicate alert'];

export function JustificationModal({
  isOpen,
  actionType,
  alertId,
  alertCoach,
  onConfirm,
  onCancel
}: JustificationModalProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isVerify = actionType === 'verify';
  const accentColor = isVerify ? '#0D6E6E' : '#DC2626';
  const quickReasons = isVerify ? QUICK_REASONS_VERIFY : QUICK_REASONS_DISMISS;
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
    if (!comment.trim()) {
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-hidden="true" />


      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)'
        }}>

        {/* Header stripe */}
        <div
          className="h-1 w-full"
          style={{
            backgroundColor: accentColor
          }}
          aria-hidden="true" />


        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: isVerify ? '#F0FDFA' : '#FEF2F2'
              }}>

              {isVerify ?
              <CheckCircleIcon
                size={18}
                style={{
                  color: accentColor
                }}
                aria-hidden="true" /> :


              <XCircleIcon
                size={18}
                style={{
                  color: accentColor
                }}
                aria-hidden="true" />

              }
            </div>
            <div>
              <h2
                id="modal-title"
                className="text-base font-bold text-gray-900 leading-tight">

                {isVerify ? 'Verify Alert' : 'Dismiss Alert'}
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
        <div className="px-6 pb-6">
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

              <MessageSquareIcon size={12} aria-hidden="true" />
              Justification comment
              <span className="text-red-400" aria-hidden="true">
                *
              </span>
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
              isVerify ?
              'Describe why this alert is being verified...' :
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
          <div className="flex items-center gap-2.5 mt-5">
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

              {isVerify ? 'Confirm Verify' : 'Confirm Dismiss'}
            </button>
          </div>
        </div>
      </div>
    </div>);

}