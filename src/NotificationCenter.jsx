import { useState, useRef, useEffect } from 'react';

export default function NotificationCenter({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  return (
    <div className="notification-center" ref={panelRef}>
      {/* Bell button */}
      <button
        className={`notification-bell${unreadCount > 0 ? ' has-unread' : ''}`}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notification history">
          <div className="notification-panel-header">
            <h3>Notifications</h3>
            <div className="notification-panel-actions">
              {unreadCount > 0 && (
                <button
                  className="notification-action-btn"
                  type="button"
                  onClick={onMarkAllRead}
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="notification-action-btn notification-clear-btn"
                  type="button"
                  onClick={onClear}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">🔔</div>
                <p>No notifications yet</p>
                <p className="notification-empty-sub">
                  Reminders will appear here when they're due
                </p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  className={`notification-item${notif.read ? '' : ' unread'}`}
                  type="button"
                  onClick={() => {
                    onMarkRead(notif.id);
                  }}
                >
                  <div className={`notification-dot${notif.read ? ' read' : ''}`} />
                  <div className="notification-item-content">
                    <p className="notification-item-title">{notif.title}</p>
                    {notif.description && (
                      <p className="notification-item-desc">{notif.description}</p>
                    )}
                    <p className="notification-item-time">{formatTime(notif.firedAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
