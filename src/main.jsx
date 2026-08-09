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
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const today = useMemo(() => new Date(), []);
  const visibleTasks = tasks.filter(task => filter === 'all' || (filter === 'completed' ? task.completed : !task.completed));
  const persist = nextTasks => {
    setTasks(nextTasks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));
  };
  const resetForm = () => { setEditingId(null); setTitle(''); setDescription(''); };

  const saveTask = event => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const nextTasks = editingId
      ? tasks.map(task => task.id === editingId ? { ...task, title: trimmedTitle, description: description.trim() } : task)
      : [{ id: crypto.randomUUID(), title: trimmedTitle, description: description.trim(), createdAt: new Date().toISOString(), completed: false, completedAt: null }, ...tasks];
    persist(nextTasks);
    resetForm();
  };

  const toggleTask = id => persist(tasks.map(task => task.id === id
    ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null }
    : task));
  const deleteTask = id => { persist(tasks.filter(task => task.id !== id)); if (editingId === id) resetForm(); };
  const startEditing = task => { setEditingId(task.id); setTitle(task.title); setDescription(task.description); window.scrollTo({ top: 0, behavior: 'smooth' }); };

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
            <p>A quiet place to collect your tasks and move through them, one at a time.</p>
          </div>
        </div>
        <div className="today-card" aria-label="Today's date">
          <span>{new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(today)}</span>
          <strong>{String(today.getDate()).padStart(2, '0')}</strong>
          <small>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(today)}</small>
        </div>
      </section>

      <section className="workspace" aria-label="Task manager">
        <form className="add-card" onSubmit={saveTask}>
          <div className="add-card-heading"><div className="icon-circle">+</div><div><h2>{editingId ? 'Edit task' : 'Add a task'}</h2><p>What needs your attention?</p></div></div>
          <label><span>Task title</span><input value={title} onChange={event => setTitle(event.target.value)} maxLength="80" required placeholder="e.g. Send the project update" autoComplete="off" /></label>
          <label><span>Description <i>(optional)</i></span><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength="300" placeholder="Add a few helpful details..." /></label>
          <div className="form-actions">
            {editingId && <button className="text-button" type="button" onClick={resetForm}>Cancel edit</button>}
            <button className="primary-button" type="submit">{editingId ? 'Save changes' : 'Add task'} <span>→</span></button>
          </div>
        </form>

        <section className="task-area" aria-labelledby="tasks-title">
          <div className="task-toolbar"><div><p className="section-kicker">TASKS</p><h2 id="tasks-title">Your list <span>{tasks.length}</span></h2></div><div className="filters" role="group" aria-label="Filter tasks">
            {[['all', 'All'], ['active', 'Active'], ['completed', 'Done']].map(([value, label]) => <button key={value} className={`filter ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)} type="button">{label}</button>)}
          </div></div>
          <div className="task-list" aria-live="polite">
            {visibleTasks.map(task => <article className={`task-card ${task.completed ? 'completed' : ''}`} key={task.id}>
              <button className="checkbox" type="button" onClick={() => toggleTask(task.id)} aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}><span>✓</span></button>
              <div className="task-content"><h3 className="task-title">{task.title}</h3>{task.description && <p className="task-description">{task.description}</p>}<p className="task-meta">{task.completed ? `Completed ${formatDate(task.completedAt)}` : `Created ${formatDate(task.createdAt)}`}</p></div>
              <div className="task-actions"><button className="icon-button edit-button" type="button" onClick={() => startEditing(task)} aria-label="Edit task">✎</button><button className="icon-button delete-button" type="button" onClick={() => deleteTask(task.id)} aria-label="Delete task">×</button></div>
            </article>)}
          </div>
          {visibleTasks.length === 0 && <div className="empty-state visible"><div className="empty-icon">✓</div><h3>{tasks.length ? 'No matching tasks' : 'Nothing here yet'}</h3><p>Add your first task and give your day a little more room to breathe.</p></div>}
        </section>
      </section>
    </main>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
