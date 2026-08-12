import { useState, useEffect, useRef } from 'react';

export default function FocusView({ 
  tasks, 
  priorities, 
  onToggleTask, 
  onExit, 
  onSaveFocusTask,
  timerDuration,
  timeLeft,
  isRunning,
  onSetTimer,
  onToggleTimer
}) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');


  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sortedPriorities = [...priorities].sort((a, b) => a.rank - b.rank);
  const topPriority = sortedPriorities[0];
  
  const focusTasks = tasks.filter(t => !t.completed && t.priority === topPriority?.id);

  // Auto-stop timer if all focus tasks are completed
  useEffect(() => {
    if (isRunning && focusTasks.length === 0) {
      if (isRunning) onToggleTimer();
    }
  }, [focusTasks.length, isRunning, onToggleTimer]);

  return (
    <section className="focus-view">
      <button className="text-button back-btn" onClick={onExit} type="button">← Exit Focus Mode</button>
      
      <div className="focus-timer-section">
        <div className="timer-display">{formatTime(timeLeft)}</div>
        <div className="timer-controls">
          <button className="primary-button" onClick={onToggleTimer}>{isRunning ? 'Pause' : 'Start Focus'}</button>
          <button className="icon-button" onClick={() => onSetTimer(timerDuration / 60)}>↺</button>
        </div>
        <div className="timer-presets mt-4">
          <button className={`preset-btn ${timerDuration === 15*60 ? 'active' : ''}`} onClick={() => onSetTimer(15)}>15m</button>
          <button className={`preset-btn ${timerDuration === 25*60 ? 'active' : ''}`} onClick={() => onSetTimer(25)}>25m</button>
          <button className={`preset-btn ${timerDuration === 45*60 ? 'active' : ''}`} onClick={() => onSetTimer(45)}>45m</button>
          <input 
            type="number" 
            min="1" 
            className="preset-btn" 
            placeholder="Custom mins"
            style={{ width: '100px', textAlign: 'center', display: 'inline-block' }}
            onChange={(e) => {
              const mins = parseInt(e.target.value, 10);
              if (mins > 0) onSetTimer(mins);
            }}
          />
        </div>
      </div>

      <div className="focus-tasks-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <h3 className="focus-heading" style={{ marginBottom: 0 }}>Top Priority: {topPriority?.name || 'High'}</h3>
          {!isAddingTask && <button className="text-button" onClick={() => setIsAddingTask(true)}>+ Add Task</button>}
        </div>

        {isAddingTask && (
          <form className="add-card mb-4" onSubmit={(e) => {
            e.preventDefault();
            if (!taskTitle.trim()) return;
            onSaveFocusTask({ title: taskTitle, priority: topPriority?.id });
            setTaskTitle('');
            setIsAddingTask(false);
          }}>
            <label><span>New task</span>
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Finish the presentation" required autoFocus />
            </label>
            <div className="form-actions mt-2">
              <button className="text-button" type="button" onClick={() => setIsAddingTask(false)}>Cancel</button>
              <button className="primary-button" type="submit">Save</button>
            </div>
          </form>
        )}
        
        {focusTasks.length === 0 ? (
          <div className="empty-state visible" style={{ marginTop: '20px' }}>
            <div className="empty-icon">🎉</div>
            <h3>All caught up</h3>
            <p>You have no critical tasks pending.</p>
          </div>
        ) : (
          <div className="task-list">
            {focusTasks.map(task => (
              <article className="task-card" key={task.id}>
                <button className="checkbox" type="button" onClick={() => onToggleTask(task.id)}><span>✓</span></button>
                <div className="task-content">
                  <h3 className="task-title">{task.title}</h3>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
