import { useState } from 'react';

export default function ToastStack({ toasts, onDismiss, onSnooze, onComplete }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="assertive" aria-label="Notifications">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onSnooze={onSnooze}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss, onSnooze, onComplete }) {
  const [showSnooze, setShowSnooze] = useState(false);

  const snoozeOptions = [
    { label: '5 min', minutes: 5 },
    { label: '15 min', minutes: 15 },
    { label: '1 hour', minutes: 60 },
  ];

  return (
    <div className="toast" role="alert">
      {/* Progress bar for auto-dismiss */}
      <div className="toast-progress" />

      {/* Content */}
      <div className="toast-body">
        <div className="toast-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div className="toast-content">
          <p className="toast-title">{toast.title}</p>
          {toast.description && (
            <p className="toast-description">{toast.description}</p>
          )}
          <p className="toast-time">
            {new Intl.DateTimeFormat(undefined, {
              hour: 'numeric', minute: '2-digit'
            }).format(new Date(toast.firedAt))}
          </p>
        </div>
        <button
          className="toast-close"
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>

      {/* Actions */}
      <div className="toast-actions">
        <button
          className="toast-action-btn toast-done-btn"
          type="button"
          onClick={() => onComplete(toast.taskId)}
        >
          <span>✓</span> Mark done
        </button>

        <div className="snooze-wrapper">
          <button
            className="toast-action-btn toast-snooze-btn"
            type="button"
            onClick={() => setShowSnooze(prev => !prev)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Snooze
          </button>

          {showSnooze && (
            <div className="snooze-dropdown">
              {snoozeOptions.map(opt => (
                <button
                  key={opt.minutes}
                  className="snooze-option"
                  type="button"
                  onClick={() => {
                    onSnooze(toast.taskId, opt.minutes);
                    setShowSnooze(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
