/**
 * Utility functions for recurring tasks in Flowlist
 */

/**
 * Generate a human-readable string for the recurrence rule
 * @param {Object} recurrence 
 * @returns {string}
 */
export function getRecurrenceLabel(recurrence) {
  if (!recurrence || recurrence.frequency === 'none') return '';
  
  const { frequency, interval = 1, weekdays = [], endDate } = recurrence;
  let label = '';
  
  switch (frequency) {
    case 'daily':
      label = interval === 1 ? 'Repeats daily' : `Repeats every ${interval} days`;
      break;
    case 'weekdays':
      label = 'Repeats every weekday';
      break;
    case 'weekly':
      label = interval === 1 ? 'Repeats weekly' : `Repeats every ${interval} weeks`;
      if (weekdays.length > 0) {
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayNames = weekdays.map(d => daysMap[d]).join(', ');
        label += ` on ${dayNames}`;
      }
      break;
    case 'monthly':
      label = interval === 1 ? 'Repeats monthly' : `Repeats every ${interval} months`;
      break;
    case 'yearly':
      label = interval === 1 ? 'Repeats yearly' : `Repeats every ${interval} years`;
      break;
    default:
      label = 'Repeats';
  }
  
  if (endDate) {
    const d = new Date(endDate);
    // Use local time formatting roughly matching the app's style
    label += ` until ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(d)}`;
  }
  
  return label;
}

/**
 * Calculate the next occurrence date based on the current completed date and rule.
 * Returns the next Date object, or null if past endDate.
 * 
 * @param {Object} recurrence 
 * @param {string|Date} fromDate The reference date (usually the task's remindAt or createdAt or today if un-dated)
 * @returns {Date|null}
 */
export function getNextOccurrenceDate(recurrence, fromDate) {
  if (!recurrence || recurrence.frequency === 'none') return null;
  
  const { frequency, interval = 1, weekdays = [], endDate } = recurrence;
  
  // Base date to calculate from
  const baseDate = fromDate ? new Date(fromDate) : new Date();
  const nextDate = new Date(baseDate);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekdays':
      do {
        nextDate.setDate(nextDate.getDate() + 1);
      } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
      break;
    case 'weekly':
      if (weekdays.length > 0) {
        // Find the next specified weekday
        let daysToAdd = 1;
        let weekJumps = 0;
        while (true) {
          const testDate = new Date(nextDate);
          testDate.setDate(testDate.getDate() + daysToAdd);
          
          // If we roll past Saturday, we increment the week counter
          if (testDate.getDay() === 0 && daysToAdd > 1) {
             weekJumps++;
          }
          
          if (weekdays.includes(testDate.getDay())) {
            // We need to advance by full intervals of weeks if we wrap around, 
            // but for simplicity let's just find the very next matching weekday.
            // If the user checked multiple days (e.g. Mon, Wed), we just jump to the next one.
            // If we've completed a full week cycle, we should jump by (interval - 1) * 7 days.
            if (weekJumps > 0 && interval > 1) {
              daysToAdd += (interval - 1) * 7;
            }
            nextDate.setDate(nextDate.getDate() + daysToAdd);
            break;
          }
          daysToAdd++;
          // Safety fallback
          if (daysToAdd > 14) {
            nextDate.setDate(nextDate.getDate() + 7 * interval);
            break;
          }
        }
      } else {
        nextDate.setDate(nextDate.getDate() + 7 * interval);
      }
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
  }
  
  if (endDate) {
    const end = new Date(endDate);
    // Ignore time for the end date check by zeroing them out
    end.setHours(23, 59, 59, 999);
    if (nextDate > end) {
      return null;
    }
  }
  
  return nextDate;
}

/**
 * Creates a duplicate task object for the next occurrence.
 * @param {Object} task 
 * @param {Date} nextDate 
 * @returns {Object}
 */
export function generateNextTaskOccurrence(task, nextDate) {
  // Deep clone to avoid mutations
  const newTask = JSON.parse(JSON.stringify(task));
  
  newTask.id = crypto.randomUUID(); // New unique ID
  newTask.completed = false;
  newTask.completedAt = null;
  newTask.createdAt = new Date().toISOString();
  
  if (Array.isArray(newTask.subtasks)) {
    newTask.subtasks.forEach(sub => {
      sub.completed = false;
    });
  }
  
  // Update reminder if it exists
  if (newTask.remindAt) {
    const oldRemind = new Date(newTask.remindAt);
    const newRemind = new Date(nextDate);
    newRemind.setHours(oldRemind.getHours(), oldRemind.getMinutes(), oldRemind.getSeconds());
    
    // Format to YYYY-MM-DDThh:mm string (local time)
    const pad = n => String(n).padStart(2, '0');
    newTask.remindAt = `${newRemind.getFullYear()}-${pad(newRemind.getMonth() + 1)}-${pad(newRemind.getDate())}T${pad(newRemind.getHours())}:${pad(newRemind.getMinutes())}`;
  }
  
  // Update recurrence status
  if (newTask.recurrence) {
    newTask.recurrence.nextOccurrenceAt = nextDate.toISOString();
  }
  
  return newTask;
}
