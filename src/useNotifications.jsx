import { useEffect, useRef, useCallback, useState } from 'react';

const NOTIFIED_KEY = 'flowlist-notified-v1';
const NOTIFICATION_LOG_KEY = 'flowlist-notification-log-v1';

/* ─── Tiny chime via Web Audio API (no external files) ─── */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);       // A5
    osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.2); // E6

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* Web Audio not available — silent fallback */
  }
}

/* ─── Get persisted set of already-notified task IDs ─── */
function getNotifiedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveNotifiedIds(set) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
}

/* ─── Get persisted notification log ─── */
function getNotificationLog() {
  try { return JSON.parse(localStorage.getItem(NOTIFICATION_LOG_KEY) || '[]'); }
  catch { return []; }
}

function saveNotificationLog(log) {
  localStorage.setItem(NOTIFICATION_LOG_KEY, JSON.stringify(log));
}

/* ─── Request browser notification permission ─── */
export function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve('denied');
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  return Notification.requestPermission();
}

/* ─── The Hook ─── */
export default function useNotifications(tasks, persistTasks, activities = [], session = null) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState(getNotificationLog);
  const notifiedRef = useRef(getNotifiedIds());
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  
  const lastActivityIdRef = useRef(activities[0]?.id);

  /* ─── Fire a notification for a task ─── */
  const fireNotification = useCallback((task) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    /* Play chime */
    playChime();

    /* Browser notification */
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(`⏰ ${task.title}`, {
          body: task.description || 'Your reminder is due!',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✓</text></svg>',
          tag: task.id,
          requireInteraction: true,
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* Notification constructor may fail in some contexts */ }
    }

    /* In-app toast */
    const toast = {
      id,
      taskId: task.id,
      title: task.title,
      description: task.description,
      firedAt: now,
      dismissed: false,
    };
    setToasts(prev => [...prev.slice(-2), toast]); /* Keep max 3 */

    /* Notification log */
    const logEntry = {
      id,
      taskId: task.id,
      title: task.title,
      description: task.description,
      firedAt: now,
      read: false,
    };
    setNotifications(prev => {
      const next = [logEntry, ...prev].slice(0, 50); /* Cap at 50 */
      saveNotificationLog(next);
      return next;
    });

    /* Mark as notified */
    notifiedRef.current.add(task.id);
    saveNotifiedIds(notifiedRef.current);
  }, []);

  const fireActivityNotification = useCallback((act) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    
    let title = 'Project Update';
    let body = 'There is new activity in your project.';
    
    if (act.type === 'member_invited') {
      title = 'New Member Invited';
      body = `${act.actorId.split('@')[0]} invited ${act.metadata.targetEmail}`;
    } else if (act.type === 'task_completed') {
      title = 'Task Completed';
      body = `${act.actorId.split('@')[0]} completed "${act.metadata.taskTitle}"`;
    } else if (act.type === 'task_added') {
      title = 'New Task Added';
      body = `${act.actorId.split('@')[0]} added "${act.metadata.taskTitle}"`;
    }

    playChime();

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(`👥 ${title}`, { body, requireInteraction: false });
        n.onclick = () => { window.focus(); n.close(); };
      } catch {}
    }

    const toast = { id, title, description: body, firedAt: now, dismissed: false };
    setToasts(prev => [...prev.slice(-2), toast]);

    const logEntry = { id, title, description: body, firedAt: now, read: false };
    setNotifications(prev => {
      const next = [logEntry, ...prev].slice(0, 50);
      saveNotificationLog(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!session || activities.length === 0) return;
    
    const newActs = [];
    for (const act of activities) {
      if (act.id === lastActivityIdRef.current) break;
      if (act.actorId !== session.email) {
        newActs.push(act);
      }
    }
    
    if (newActs.length > 0) {
      newActs.forEach(act => fireActivityNotification(act));
    }
    
    lastActivityIdRef.current = activities[0].id;
  }, [activities, session, fireActivityNotification]);

  /* ─── Check loop (every 15 seconds) ─── */
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      tasksRef.current.forEach(task => {
        if (
          task.remindAt &&
          !task.completed &&
          !notifiedRef.current.has(task.id) &&
          new Date(task.remindAt).getTime() <= now
        ) {
          fireNotification(task);
        }
      });
    };

    check(); /* Run immediately on mount */
    const interval = setInterval(check, 15_000);
    return () => clearInterval(interval);
  }, [fireNotification]);

  /* ─── Dismiss a toast ─── */
  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  /* ─── Auto-dismiss toasts after 10 seconds ─── */
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(toast =>
      setTimeout(() => dismissToast(toast.id), 10_000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  /* ─── Snooze a reminder ─── */
  const snoozeTask = useCallback((taskId, minutes) => {
    const snoozedUntil = new Date(Date.now() + minutes * 60_000).toISOString();
    const nextTasks = tasksRef.current.map(t =>
      t.id === taskId ? { ...t, remindAt: snoozedUntil } : t
    );
    /* Remove from notified set so it fires again */
    notifiedRef.current.delete(taskId);
    saveNotifiedIds(notifiedRef.current);
    persistTasks(nextTasks);

    /* Dismiss any related toast */
    setToasts(prev => prev.filter(t => t.taskId !== taskId));
  }, [persistTasks]);

  /* ─── Complete task from toast ─── */
  const completeTaskFromToast = useCallback((taskId) => {
    const nextTasks = tasksRef.current.map(t =>
      t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
    );
    persistTasks(nextTasks);
    setToasts(prev => prev.filter(t => t.taskId !== taskId));
  }, [persistTasks]);

  /* ─── Mark notification as read ─── */
  const markRead = useCallback((notifId) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === notifId ? { ...n, read: true } : n);
      saveNotificationLog(next);
      return next;
    });
  }, []);

  /* ─── Mark all as read ─── */
  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      saveNotificationLog(next);
      return next;
    });
  }, []);

  /* ─── Clear notification log ─── */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    saveNotificationLog([]);
  }, []);

  /* ─── Unread count ─── */
  const unreadCount = notifications.filter(n => !n.read).length;

  /* ─── Overdue tasks (past remindAt, not completed, already notified) ─── */
  const overdueTasks = new Set(
    tasks
      .filter(t => t.remindAt && !t.completed && new Date(t.remindAt).getTime() < Date.now())
      .map(t => t.id)
  );

  /* ─── When tasks change, clean up notified set ─── */
  useEffect(() => {
    const taskIds = new Set(tasks.map(t => t.id));
    let changed = false;
    for (const id of notifiedRef.current) {
      if (!taskIds.has(id)) {
        notifiedRef.current.delete(id);
        changed = true;
      }
    }
    if (changed) saveNotifiedIds(notifiedRef.current);
  }, [tasks]);

  return {
    toasts,
    notifications,
    unreadCount,
    overdueTasks,
    dismissToast,
    snoozeTask,
    completeTaskFromToast,
    markRead,
    markAllRead,
    clearNotifications,
  };
}
