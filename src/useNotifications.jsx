import { useEffect, useRef, useCallback, useState } from 'react';
import { repository } from './data/repository.js';

import { notificationService } from './services/NotificationService.js';

/* ─── Request browser notification permission ─── */
export function requestNotificationPermission() {
  return notificationService.requestPermission();
}

/* ─── The Hook ─── */
export default function useNotifications(tasks, persistTasks, activities = [], session = null) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const notifiedRef = useRef(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      const logs = await repository.getNotificationLog();
      const notifs = await repository.getNotified();
      setNotifications(logs);
      notifiedRef.current = notifs;
      setLoaded(true);
    }
    loadData();
  }, []);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  
  const lastActivityIdRef = useRef(activities[0]?.id);

  /* ─── Handle Incoming Notification Events ─── */
  useEffect(() => {
    if (!loaded) return;

    const handleNotify = (e) => {
      const task = e.detail;
      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      const toast = {
        id,
        taskId: task.id,
        title: task.title,
        description: task.description,
        firedAt: now,
        dismissed: false,
      };
      setToasts(prev => [...prev.slice(-2), toast]);

      const logEntry = {
        id,
        taskId: task.id,
        title: task.title,
        description: task.description,
        firedAt: now,
        read: false,
      };
      setNotifications(prev => {
        const next = [logEntry, ...prev].slice(0, 50);
        repository.saveNotificationLog(next);
        return next;
      });
    };

    const handleAcknowledge = (e) => {
      const taskId = e.detail;
      notifiedRef.current.add(taskId);
      repository.saveNotified(Array.from(notifiedRef.current));
      setToasts(prev => prev.filter(t => t.taskId !== taskId));
    };

    window.addEventListener('flowlist:notify', handleNotify);
    window.addEventListener('flowlist:acknowledge', handleAcknowledge);
    return () => {
      window.removeEventListener('flowlist:notify', handleNotify);
      window.removeEventListener('flowlist:acknowledge', handleAcknowledge);
    };
  }, [loaded]);

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
      repository.saveNotificationLog(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
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
  }, [activities, session, fireActivityNotification, loaded]);


  useEffect(() => {
    if (!loaded) return;
    notificationService.syncSchedules(tasks, notifiedRef.current);
  }, [tasks, loaded]);

  /* ─── Dismiss a toast ─── */
  const dismissToast = useCallback((toastId) => {
    const toast = toasts.find(t => t.id === toastId);
    if (toast) {
      notifiedRef.current.add(toast.taskId);
      repository.saveNotified(Array.from(notifiedRef.current));
    }
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, [toasts]);

  /* ─── Snooze a reminder ─── */
  const snoozeTask = useCallback((taskId, minutes) => {
    const snoozedUntil = new Date(Date.now() + minutes * 60_000).toISOString();
    const nextTasks = tasksRef.current.map(t =>
      t.id === taskId ? { ...t, remindAt: snoozedUntil } : t
    );
    /* Remove from notified set so it fires again */
    notifiedRef.current.delete(taskId);
    repository.saveNotified(Array.from(notifiedRef.current));
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
  const markRead = useCallback((id) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      repository.saveNotificationLog(next);
      return next;
    });
  }, []);

  /* ─── Mark all as read ─── */
  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      repository.saveNotificationLog(next);
      return next;
    });
  }, []);

  /* ─── Clear notification log ─── */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    repository.saveNotificationLog([]);
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
    if (changed) repository.saveNotified(Array.from(notifiedRef.current));
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
