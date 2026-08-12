import { useState, useMemo } from 'react';
import { getRecurrenceLabel } from './utils/recurrence.js';

export default function RecurringTasksView({ tasks, projects, onUpdateTasks, priorities, tags }) {
  const [filter, setFilter] = useState('active'); // active, paused, ended
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', remindAt: '', recurrenceFrequency: 'daily', recurrenceInterval: 1, recurrenceWeekdays: [], recurrenceEndDate: '' });

  // Extract unique series from tasks
  const seriesList = useMemo(() => {
    const seriesMap = new Map();
    
    // Process tasks to find the latest state of each series
    // Sort by createdAt descending so we process the newest first
    const sortedTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    for (const task of sortedTasks) {
      if (task.recurrence && task.recurrence.seriesId) {
        const sid = task.recurrence.seriesId;
        // If we haven't seen this series, or if this task is active and the previous one we found was completed, update it
        // We want to represent the series by its current active occurrence if possible.
        if (!seriesMap.has(sid)) {
          seriesMap.set(sid, task);
        } else {
          const existing = seriesMap.get(sid);
          if (existing.completed && !task.completed) {
            seriesMap.set(sid, task);
          }
        }
      }
    }
    
    return Array.from(seriesMap.values());
  }, [tasks]);

  const filteredSeries = seriesList.filter(task => {
    const status = task.recurrence.status || 'active';
    return status === filter;
  });

  const handleStatusChange = (seriesId, newStatus) => {
    // Update all tasks in this series to the new status
    const nextTasks = tasks.map(task => {
      if (task.recurrence && task.recurrence.seriesId === seriesId) {
        return {
          ...task,
          recurrence: {
            ...task.recurrence,
            status: newStatus
          }
        };
      }
      return task;
    });
    onUpdateTasks(nextTasks);
  };

  const handleStopRepeating = (seriesId) => {
    handleStatusChange(seriesId, 'ended');
  };

  return (
    <section className="recurring-tasks-view fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="recurring-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '28px', margin: 0 }}>Recurring tasks</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>Small routines, handled for you.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setIsAdding(true)}>New recurring <span>+</span></button>
      </div>

      {isAdding && (
        <form className="add-card mb-4" onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          const finalRecurrence = {
            seriesId: crypto.randomUUID(),
            frequency: form.recurrenceFrequency,
            interval: Number(form.recurrenceInterval) || 1,
            weekdays: form.recurrenceWeekdays,
            endDate: form.recurrenceEndDate || null,
            status: 'active'
          };
          const newTask = {
            id: crypto.randomUUID(),
            type: 'recurring',
            title: form.title,
            description: form.description,
            remindAt: form.remindAt || null,
            projectId: null,
            priority: null,
            tags: [],
            recurrence: finalRecurrence,
            createdAt: new Date().toISOString(),
            completed: false,
            completedAt: null
          };
          onUpdateTasks([newTask, ...tasks]);
          setForm({ title: '', description: '', remindAt: '', recurrenceFrequency: 'daily', recurrenceInterval: 1, recurrenceWeekdays: [], recurrenceEndDate: '' });
          setIsAdding(false);
        }}>
          <label><span>Task title</span>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Daily Workout" required autoFocus />
          </label>
          <label><span>Remind me <i>(optional)</i></span>
            <input type="datetime-local" value={form.remindAt} onChange={e => setForm({...form, remindAt: e.target.value})} />
          </label>
          <label>
            <span>Repeat</span>
            <select value={form.recurrenceFrequency} onChange={e => setForm({...form, recurrenceFrequency: e.target.value})}>
              <option value="daily">Daily</option>
              <option value="weekdays">Every weekday</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom...</option>
            </select>
          </label>
          {form.recurrenceFrequency === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '-8px', marginBottom: '16px' }}>
              <label style={{ margin: 0 }}>
                <span>Every</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" min="1" value={form.recurrenceInterval} onChange={e => setForm({...form, recurrenceInterval: e.target.value})} style={{ width: '80px' }} />
                  <select value={form.recurrenceFrequency} onChange={e => setForm({...form, recurrenceFrequency: e.target.value})} style={{ flex: 1, padding: '11px 12px', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--paper)', outline: 'none' }}>
                    <option value="daily">days</option>
                    <option value="weekly">weeks</option>
                    <option value="monthly">months</option>
                    <option value="yearly">years</option>
                  </select>
                </div>
              </label>
            </div>
          )}
          {(form.recurrenceFrequency === 'weekly' || (form.recurrenceFrequency === 'custom' && form.recurrenceFrequency === 'weekly')) && (
            <div style={{ marginBottom: '16px' }}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>On these days</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`preset-btn ${form.recurrenceWeekdays.includes(idx) ? 'active' : ''}`}
                    style={{ padding: '6px 10px', minWidth: '32px' }}
                    onClick={() => {
                      const w = form.recurrenceWeekdays;
                      setForm({...form, recurrenceWeekdays: w.includes(idx) ? w.filter(d => d !== idx) : [...w, idx]});
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label><span>Description <i>(optional)</i></span>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Add details..." />
          </label>
          <div className="form-actions mt-2">
            <button className="text-button" type="button" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="primary-button" type="submit">Save series</button>
          </div>
        </form>
      )}

      <div className="filters" style={{ marginBottom: '24px', width: 'max-content' }}>
        <button className={`filter ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
        <button className={`filter ${filter === 'paused' ? 'active' : ''}`} onClick={() => setFilter('paused')}>Paused</button>
        <button className={`filter ${filter === 'ended' ? 'active' : ''}`} onClick={() => setFilter('ended')}>Ended</button>
      </div>

      {filteredSeries.length === 0 ? (
        <div className="empty-state visible">
          <div className="empty-icon">↻</div>
          <h3>No {filter} recurring tasks</h3>
          <p>Recurring tasks are useful for routines, bills, workouts, medication, and regular reviews.</p>
        </div>
      ) : (
        <div className="task-list">
          {filteredSeries.map(task => {
            const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
            const status = task.recurrence.status || 'active';
            
            return (
              <article className="task-card" key={task.recurrence.seriesId} style={{ flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                  <div className="task-content">
                    <h3 className="task-title" style={{ fontSize: '16px', marginBottom: '4px' }}>{task.title}</h3>
                    <p className="recurrence-label" style={{ fontSize: '12px', color: 'var(--purple)', fontWeight: 600, margin: 0 }}>
                      ↻ {getRecurrenceLabel(task.recurrence)}
                    </p>
                    {task.remindAt && (
                      <p className="reminder-time" style={{ marginTop: '4px' }}>
                        Next: {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(task.remindAt))}
                      </p>
                    )}
                    
                    <div className="task-badges" style={{ marginTop: '8px' }}>
                      {proj && (
                        <span className="badge project-badge" style={{ '--badge-color': proj.color || '#9e90ff' }}>
                          {proj.icon} {proj.name}
                        </span>
                      )}
                      {status === 'paused' && (
                        <span className="badge" style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' }}>Paused</span>
                      )}
                      {status === 'ended' && (
                        <span className="badge" style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>Ended</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="recurring-actions" style={{ display: 'flex', gap: '8px' }}>
                    {status === 'active' && (
                      <button className="text-button" onClick={() => handleStatusChange(task.recurrence.seriesId, 'paused')} style={{ fontSize: '12px' }}>Pause</button>
                    )}
                    {status === 'paused' && (
                      <button className="primary-button" onClick={() => handleStatusChange(task.recurrence.seriesId, 'active')} style={{ padding: '6px 12px', fontSize: '12px' }}>Resume</button>
                    )}
                    {status !== 'ended' && (
                      <button className="text-button" onClick={() => handleStopRepeating(task.recurrence.seriesId)} style={{ fontSize: '12px', color: 'var(--danger)' }}>Stop repeating</button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
