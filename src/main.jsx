import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Ballpit from './Ballpit.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import '../styles.css';

const STORAGE_KEY = 'flowlist-tasks-v1';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(value));
}

function App() {
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  const [listType, setListType] = useState('tasks');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remindAt, setRemindAt] = useState('');

  const today = useMemo(() => new Date(), []);
  const currentTasks = tasks.filter(task => (task.type || 'tasks') === listType);
  const visibleTasks = currentTasks.filter(task => filter === 'all' || (filter === 'completed' ? task.completed : !task.completed));
  const persist = nextTasks => {
    setTasks(nextTasks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));
  };
  const resetForm = () => { setEditingId(null); setTitle(''); setDescription(''); setRemindAt(''); };

  const saveTask = event => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const nextTasks = editingId
      ? tasks.map(task => task.id === editingId ? { ...task, title: trimmedTitle, description: description.trim(), remindAt: listType === 'reminders' ? remindAt : null } : task)
      : [{ id: crypto.randomUUID(), type: listType, title: trimmedTitle, description: description.trim(), remindAt: listType === 'reminders' ? remindAt : null, createdAt: new Date().toISOString(), completed: false, completedAt: null }, ...tasks];
    persist(nextTasks);
    resetForm();
  };

  const toggleTask = id => persist(tasks.map(task => task.id === id
    ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null }
    : task));
  const deleteTask = id => { persist(tasks.filter(task => task.id !== id)); if (editingId === id) resetForm(); };
  const startEditing = task => { setEditingId(task.id); setTitle(task.title); setDescription(task.description); setRemindAt(task.remindAt || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const switchList = type => { setListType(type); setFilter('all'); resetForm(); };

  return <>
    <div className="ballpit-container" aria-hidden="true">
      <Ballpit
        count={200}
        colors={[0x6254e7, 0x9e90ff, 0x8ac6ff, 0xf5b267, 0xffb7a4]}
        radiusCm={1}
        gravity={0}
        friction={0.94}
        wallBounce={0.95}
        maxVelocity={0.65}
        cursorForce={8}
        followCursor={true}
      />
    </div>
    <main className="app-shell">
      <ThemeToggle />
      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow"><span /> YOUR DAY, ORGANIZED</p>
          <h1 id="page-title">Make space for<br /><em>what matters.</em></h1>
          <div className="hero-copy">
            <p>Choose a simple to-do list or plan the things you need to remember.</p>
          </div>
        </div>
        <div className="today-card" aria-label="Today's date">
          <span>{new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(today)}</span>
          <strong>{String(today.getDate()).padStart(2, '0')}</strong>
          <small>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(today)}</small>
        </div>
      </section>

      <section className="workspace" aria-label="Task manager">
        <div className="list-switcher" role="tablist" aria-label="Choose list type">
          <button className={listType === 'tasks' ? 'active' : ''} onClick={() => switchList('tasks')} type="button" role="tab" aria-selected={listType === 'tasks'}><span>✓</span><b>To-do list</b><small>Plan your tasks</small></button>
          <button className={listType === 'reminders' ? 'active' : ''} onClick={() => switchList('reminders')} type="button" role="tab" aria-selected={listType === 'reminders'}><span>◷</span><b>Reminder list</b><small>Never miss a thing</small></button>
        </div>
        <form className="add-card" onSubmit={saveTask}>
          <div className="add-card-heading"><div className="icon-circle">{listType === 'tasks' ? '+' : '◷'}</div><div><h2>{editingId ? `Edit ${listType === 'tasks' ? 'task' : 'reminder'}` : `Add a ${listType === 'tasks' ? 'task' : 'reminder'}`}</h2><p>{listType === 'tasks' ? 'What needs your attention?' : 'What would you like to remember?'}</p></div></div>
          <label><span>{listType === 'tasks' ? 'Task title' : 'Reminder title'}</span><input value={title} onChange={event => setTitle(event.target.value)} maxLength="80" required placeholder={listType === 'tasks' ? 'e.g. Send the project update' : 'e.g. Call Mum'} autoComplete="off" /></label>
          {listType === 'reminders' && <label><span>Remind me <i>(optional)</i></span><input type="datetime-local" value={remindAt} onChange={event => setRemindAt(event.target.value)} /></label>}
          <label><span>Description <i>(optional)</i></span><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength="300" placeholder="Add a few helpful details..." /></label>
          <div className="form-actions">
            {editingId && <button className="text-button" type="button" onClick={resetForm}>Cancel edit</button>}
            <button className="primary-button" type="submit">{editingId ? 'Save changes' : `Add ${listType === 'tasks' ? 'task' : 'reminder'}`} <span>→</span></button>
          </div>
        </form>

        <section className="task-area" aria-labelledby="tasks-title">
          <div className="task-toolbar"><div><p className="section-kicker">{listType === 'tasks' ? 'TASKS' : 'REMINDERS'}</p><h2 id="tasks-title">{listType === 'tasks' ? 'Your to-dos' : 'Your reminders'} <span>{currentTasks.length}</span></h2></div><div className="filters" role="group" aria-label="Filter tasks">
            {[['all', 'All'], ['active', 'Active'], ['completed', 'Done']].map(([value, label]) => <button key={value} className={`filter ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)} type="button">{label}</button>)}
          </div></div>
          <div className="task-list" aria-live="polite">
            {visibleTasks.map(task => <article className={`task-card ${task.completed ? 'completed' : ''}`} key={task.id}>
              <button className="checkbox" type="button" onClick={() => toggleTask(task.id)} aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}><span>✓</span></button>
              <div className="task-content"><h3 className="task-title">{task.title}</h3>{task.remindAt && <p className="reminder-time">◷ {formatDate(task.remindAt)}</p>}{task.description && <p className="task-description">{task.description}</p>}<p className="task-meta">{task.completed ? `Completed ${formatDate(task.completedAt)}` : `Created ${formatDate(task.createdAt)}`}</p></div>
              <div className="task-actions"><button className="icon-button edit-button" type="button" onClick={() => startEditing(task)} aria-label="Edit task">✎</button><button className="icon-button delete-button" type="button" onClick={() => deleteTask(task.id)} aria-label="Delete task">×</button></div>
            </article>)}
          </div>
          {visibleTasks.length === 0 && <div className="empty-state visible"><div className="empty-icon">{listType === 'tasks' ? '✓' : '◷'}</div><h3>{currentTasks.length ? `No matching ${listType === 'tasks' ? 'tasks' : 'reminders'}` : 'Nothing here yet'}</h3><p>{listType === 'tasks' ? 'Add your first task and give your day a little more room to breathe.' : 'Add a reminder and make space in your mind for what matters.'}</p></div>}
        </section>
      </section>
    </main>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
