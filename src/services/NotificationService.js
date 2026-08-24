/**
 * NotificationService
 * Abstracts browser Notification, Web Audio, and scheduling logic.
 * Designed to be easily extensible with native Capacitor plugins in the future.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/* ─── Tiny chime via Web Audio API ─── */
function playChime() {
  if (typeof window === 'undefined') return;
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

function hashUUIDToInt32(uuid) {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = ((hash << 5) - hash) + uuid.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

class NotificationService {
  constructor() {
    this._timeouts = new Map();

    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const taskId = action.notification.extra?.taskId;
        if (taskId) {
          window.dispatchEvent(new CustomEvent('flowlist:acknowledge', { detail: taskId }));
        }
      });
    }
  }

  /**
   * Request system notification permissions.
   */
  async requestPermission() {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.requestPermissions();
      return status.display;
    }
    
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return await Notification.requestPermission();
  }

  /**
   * Clears all scheduled timeouts and reschedules based on current tasks.
   * Instantly fires notifications for overdue tasks that aren't acknowledged.
   * @param {Array} tasks - All tasks
   * @param {Set} acknowledgedSet - Set of task IDs that have already been acknowledged
   */
  syncSchedules(tasks, acknowledgedSet) {
    if (typeof window === 'undefined') return;

    // Clear existing to avoid leaks/duplicates
    for (const timeoutId of this._timeouts.values()) {
      clearTimeout(timeoutId);
    }
    this._timeouts.clear();
    
    // Fallback to JS timeouts for all platforms to avoid Android 14 SecurityException crashes
    // with exact alarms on LocalNotifications.

    const now = Date.now();

    for (const task of tasks) {
      if (!task.reminder || task.completed) continue;
      if (acknowledgedSet.has(task.id)) continue;

      const dueTime = new Date(task.reminder).getTime();
      const delay = dueTime - now;

      if (delay <= 0) {
        // Overdue and unacknowledged: fire immediately
        this._fire(task);
      } else if (delay < 86400000) { // Only schedule if due within the next 24 hours
        this._schedule(task, delay);
      }
    }
  }

  async _syncNativeSchedules(tasks, acknowledgedSet) {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const notificationsToSchedule = [];
    const now = Date.now();

    for (const task of tasks) {
      if (!task.reminder || task.completed) continue;
      if (acknowledgedSet.has(task.id)) continue;

      const dueTime = new Date(task.reminder).getTime();
      const delay = dueTime - now;

      if (delay <= 0) {
        this._fire(task);
      } else {
        notificationsToSchedule.push({
          title: `⏰ ${task.title}`,
          body: task.description || 'Your reminder is due!',
          id: hashUUIDToInt32(task.id),
          schedule: { at: new Date(dueTime) },
          extra: { taskId: task.id }
        });
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  }

  /**
   * Schedules a reminder if it is in the future.
   */
  _schedule(task, delayMs) {
    this.cancelReminder(task.id); // clear existing if any

    const timeoutId = setTimeout(() => {
      this._timeouts.delete(task.id);
      this._fire(task);
    }, delayMs);

    this._timeouts.set(task.id, timeoutId);
  }

  /**
   * Manually schedule a reminder for a single task (e.g., when created/edited).
   */
  scheduleReminder(task, isAcknowledged) {
    this.cancelReminder(task.id);
    if (!task.reminder || task.completed || isAcknowledged) return;

    const dueTime = new Date(task.reminder).getTime();
    const delay = dueTime - Date.now();
    
    if (delay <= 0) {
      this._fire(task);
    } else {
      this._schedule(task, delay);
    }
  }

  /**
   * Cancels a pending reminder.
   */
  cancelReminder(taskId) {
    if (this._timeouts.has(taskId)) {
      clearTimeout(this._timeouts.get(taskId));
      this._timeouts.delete(taskId);
    }
  }

  /**
   * Fires the notification (OS + Audio + In-App Event).
   */
  _fire(task) {
    if (!Capacitor.isNativePlatform()) {
      playChime();
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(`⏰ ${task.title}`, {
          body: task.description || 'Your reminder is due!',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✓</text></svg>',
          tag: String(task.id), // Prevent stacking duplicates in notification center
          requireInteraction: true,
        });
        
        n.onclick = () => { 
          window.focus(); 
          n.close();
          // Dispatch custom event to acknowledge in React state
          window.dispatchEvent(new CustomEvent('flowlist:acknowledge', { detail: task.id }));
        };
      } catch { /* Notification constructor may fail in some contexts */ }
    }

    // 2. Dispatch custom event for React to show Toast
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowlist:notify', { detail: task }));
    }
  }
}

export const notificationService = new NotificationService();
