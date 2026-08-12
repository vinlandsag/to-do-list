import { useState, useMemo } from 'react';

export default function CalendarView({ tasks, onToggleTask, onEditTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateTasks, setSelectedDateTasks] = useState(null);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); 
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, date: null });
    }
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      // Strip time for exact matching
      const dateStr = date.toISOString().split('T')[0];
      days.push({ day: i, date, dateStr });
    }
    return days;
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map = new Map();
    tasks.forEach(task => {
      if (!task.remindAt) return;
      const dateStr = new Date(task.remindAt).toISOString().split('T')[0];
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr).push(task);
    });
    return map;
  }, [tasks]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleDayClick = (cell) => {
    if (!cell.date) return;
    const dayTasks = tasksByDate.get(cell.dateStr) || [];
    setSelectedDateTasks({
      date: cell.date,
      dateStr: cell.dateStr,
      tasks: dayTasks
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="calendar-view-container">
      <div className="calendar-header">
        <h2 className="calendar-title">
          {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(currentDate)}
        </h2>
        <div className="calendar-controls">
          <button className="text-button" onClick={goToday} type="button">Today</button>
          <button className="icon-button" onClick={prevMonth} type="button" aria-label="Previous month">←</button>
          <button className="icon-button" onClick={nextMonth} type="button" aria-label="Next month">→</button>
        </div>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        
        {calendarDays.map((cell, idx) => {
          if (!cell.date) return <div key={`empty-${idx}`} className="calendar-cell empty" />;
          
          const isToday = cell.dateStr === todayStr;
          const dayTasks = tasksByDate.get(cell.dateStr) || [];
          const activeTasks = dayTasks.filter(t => !t.completed);
          
          return (
            <button 
              key={cell.dateStr} 
              className={`calendar-cell ${isToday ? 'today' : ''} ${dayTasks.length > 0 ? 'has-tasks' : ''}`}
              onClick={() => handleDayClick(cell)}
              type="button"
            >
              <div className="calendar-cell-date">{cell.day}</div>
              <div className="calendar-cell-dots">
                {activeTasks.slice(0, 3).map((t, i) => (
                  <span key={i} className="calendar-dot active"></span>
                ))}
                {activeTasks.length > 3 && <span className="calendar-dot-more">+</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day Details Popover Modal */}
      {selectedDateTasks && (
        <div className="calendar-modal-scrim" onClick={() => setSelectedDateTasks(null)}>
          <div className="calendar-modal" onClick={e => e.stopPropagation()}>
            <div className="calendar-modal-header">
              <h3>
                {new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(selectedDateTasks.date)}
              </h3>
              <button className="icon-button" onClick={() => setSelectedDateTasks(null)} type="button">×</button>
            </div>
            
            <div className="calendar-modal-content">
              {selectedDateTasks.tasks.length === 0 ? (
                <div className="empty-state visible" style={{ padding: '30px' }}>
                  <p>No reminders scheduled for this day.</p>
                </div>
              ) : (
                <div className="task-list">
                  {selectedDateTasks.tasks.map(task => (
                    <article className={`task-card ${task.completed ? 'completed' : ''}`} key={task.id}>
                      <button className="checkbox" type="button" onClick={() => onToggleTask(task.id)}>
                        <span>✓</span>
                      </button>
                      <div className="task-content">
                        <h3 className="task-title">{task.title}</h3>
                        <p className="reminder-time">
                          ◷ {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(task.remindAt))}
                        </p>
                      </div>
                      <div className="task-actions">
                        <button className="icon-button edit-button" type="button" onClick={() => { onEditTask(task); setSelectedDateTasks(null); }}>✎</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
