import { useState } from 'react';
import { getRecurrenceLabel } from './utils/recurrence.js';
import { 
  canManageProject, 
  canEditTasks, 
  isViewer, 
  getAvatarInitials, 
  getAvatarColor 
} from './utils/collaboration.js';
import ProjectShareModal from './ProjectShareModal.jsx';

export default function ProjectsView({ 
  projects, 
  tasks, 
  session,
  activities = [],
  onUpdateActivities,
  onSaveProject, 
  onDeleteProject, 
  onArchiveProject,
  onToggleTask,
  onEditTask,
  onSaveProjectTask,
  overdueTasks = new Set()
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '🎯', description: '', goal: '', color: '#9e90ff' });

  // Inline task form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', remindAt: '', recurrenceFrequency: 'none', recurrenceInterval: 1, recurrenceWeekdays: [], recurrenceEndDate: '', assignedTo: '' });

  // Collaboration State
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  const activeProjects = projects.filter(p => p.status !== 'archived');
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const resetForm = () => {
    setForm({ name: '', icon: '🎯', description: '', goal: '', color: '#9e90ff' });
    setIsCreating(false);
    setEditingProject(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    
    if (editingProject) {
      onSaveProject({ ...editingProject, ...form });
    } else {
      onSaveProject({
        id: crypto.randomUUID(),
        ...form,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    }
    resetForm();
  };

  const startEdit = (project) => {
    setForm({ name: project.name, icon: project.icon || '', description: project.description || '', goal: project.goal || '', color: project.color || '#9e90ff' });
    setEditingProject(project);
    setIsCreating(true);
  };

  function renderAvatars(project) {
    if (!project.members || project.members.length === 0) return null;
    const allUsers = [{ email: project.ownerId, name: project.ownerId }, ...project.members];
    const maxShown = 3;
    const shownUsers = allUsers.slice(0, maxShown);
    const extraCount = allUsers.length - shownUsers.length;
  
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {shownUsers.map((u, i) => (
          <div key={u.email} title={u.email} style={{
            width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(u.email),
            color: '#fff', fontSize: '10px', fontWeight: 'bold', display: 'grid', placeItems: 'center',
            border: '2px solid var(--paper)', marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i
          }}>
            {getAvatarInitials(u.name || u.email)}
          </div>
        ))}
        {extraCount > 0 && (
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--line)',
            color: 'var(--ink)', fontSize: '10px', fontWeight: 'bold', display: 'grid', placeItems: 'center',
            border: '2px solid var(--paper)', marginLeft: -8, zIndex: 0
          }}>
            +{extraCount}
          </div>
        )}
      </div>
    );
  }

  // Dashboard View
  if (!selectedProjectId && !isCreating) {
    return (
      <section className="projects-dashboard">
        <div className="projects-header">
          <div>
            <h2>Your Projects</h2>
            <p>What are you trying to finish?</p>
          </div>
          <button className="primary-button" onClick={() => setIsCreating(true)} type="button">New project <span>+</span></button>
        </div>

        {activeProjects.length === 0 ? (
          <div className="empty-state visible">
            <div className="empty-icon">▣</div>
            <h3>No active projects</h3>
            <p>Create a project to organize tasks towards a larger goal.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {activeProjects.map(project => {
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              const completedTasks = projectTasks.filter(t => t.completed).length;
              const progress = projectTasks.length ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
              const nextTask = projectTasks.find(t => !t.completed);

              return (
                <div key={project.id} className="project-card" onClick={() => { setSelectedProjectId(project.id); setActiveTab('tasks'); }}>
                  <div className="project-card-header">
                    <div className="project-icon" style={{ backgroundColor: project.color }}>{project.icon}</div>
                    <div className="project-status-badge">{project.status}</div>
                  </div>
                  <h3>{project.name}</h3>
                  {project.description && <p className="project-description">{project.description}</p>}
                  
                  <div className="project-progress">
                    <div className="progress-text">
                      <span>Progress</span>
                      <span>{completedTasks} / {projectTasks.length}</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${progress}%`, backgroundColor: project.color }}></div>
                    </div>
                  </div>

                  {nextTask && (
                    <div className="project-next-task">
                      <small>Next up:</small>
                      <p>{nextTask.title}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  // Project Create/Edit View
  if (isCreating) {
    return (
      <section className="projects-form-view">
        <button className="text-button back-btn" onClick={resetForm} type="button">← Back</button>
        <h2>{editingProject ? 'Edit Project' : 'New Project'}</h2>
        <form className="add-card" onSubmit={handleSave}>
          <div className="form-row-2">
            <label><span>Name</span><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} maxLength="50" required placeholder="e.g. Website Redesign" /></label>
            <label><span>Emoji Icon</span><input value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} maxLength="2" /></label>
          </div>
          <label><span>Description <i>(optional)</i></span><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} maxLength="100" placeholder="A short summary of this project" /></label>
          <label><span>Goal/Outcome <i>(optional)</i></span><textarea value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} maxLength="300" placeholder="What does success look like?" /></label>
          <label><span>Brand Color</span>
            <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="color-picker" />
          </label>
          <div className="form-actions">
            <button className="text-button" type="button" onClick={resetForm}>Cancel</button>
            <button className="primary-button" type="submit">{editingProject ? 'Save changes' : 'Create project'}</button>
          </div>
        </form>
      </section>
    );
  }

  // Detailed Project View
  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
    const completedTasks = projectTasks.filter(t => t.completed).length;
    const progress = projectTasks.length ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
    const activeProjectTasks = projectTasks.filter(t => !t.completed);
    const completedProjectTasks = projectTasks.filter(t => t.completed);
    const nextTask = activeProjectTasks[0];

    const userCanManage = canManageProject(selectedProject, session?.email);
    const userCanEditTasks = canEditTasks(selectedProject, session?.email);
    const userIsViewer = isViewer(selectedProject, session?.email);

    return (
      <section className="project-detail-view">
        <button className="text-button back-btn" onClick={() => { setSelectedProjectId(null); setIsAddingTask(false); }} type="button">← Back to Projects</button>
        
        <div className="project-detail-header" style={{ borderTop: `4px solid ${selectedProject.color}` }}>
          <div className="header-top">
            <div className="title-group">
              <span className="detail-icon" style={{ backgroundColor: selectedProject.color }}>{selectedProject.icon}</span>
              <h2>{selectedProject.name}</h2>
            </div>
            <div className="action-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedProject.isShared && renderAvatars(selectedProject)}
              
              {(userCanManage || userCanEditTasks) && (
                <button className="text-button" onClick={() => setShowShareModal(true)} style={{ fontSize: '13px', padding: '6px 12px', border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--paper)', fontWeight: 600 }}>
                  Share
                </button>
              )}

              {userCanManage && (
                <>
                  <button className="icon-button" onClick={() => startEdit(selectedProject)} title="Edit Project">✎</button>
                  <button className="icon-button" onClick={() => {
                      onArchiveProject(selectedProject.id);
                      setSelectedProjectId(null);
                    }} title="Archive Project">📦</button>
                </>
              )}
            </div>
          </div>
          
          {selectedProject.description && <p className="detail-description">{selectedProject.description}</p>}
          {selectedProject.goal && (
            <div className="detail-goal">
              <strong>Goal:</strong> {selectedProject.goal}
            </div>
          )}

          {progress === 100 ? (
            <div style={{ marginTop: '24px', background: 'color-mix(in srgb, var(--purple) 15%, var(--paper))', color: 'var(--purple)', padding: '14px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🎉</span> Project Complete!
            </div>
          ) : (
            <div className="project-progress large">
              <div className="progress-text">
                <span>{progress}% Completed</span>
                <span>{completedTasks} / {projectTasks.length} tasks</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%`, backgroundColor: selectedProject.color }}></div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '1px solid var(--line)' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('tasks')}
            style={{ padding: '0 0 10px', background: 'transparent', border: 'none', borderBottom: activeTab === 'tasks' ? '2px solid var(--purple)' : '2px solid transparent', color: activeTab === 'tasks' ? 'var(--ink)' : 'var(--muted)', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
            Tasks
          </button>
          {selectedProject.isShared && (
             <button 
                type="button"
                onClick={() => setActiveTab('activity')}
                style={{ padding: '0 0 10px', background: 'transparent', border: 'none', borderBottom: activeTab === 'activity' ? '2px solid var(--purple)' : '2px solid transparent', color: activeTab === 'activity' ? 'var(--ink)' : 'var(--muted)', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
               Activity
             </button>
          )}
        </div>

        {activeTab === 'tasks' && (
          <>
            {nextTask && userCanEditTasks && (
              <div className="next-up-banner">
                <span className="next-badge">Next Up</span>
                <div className="next-task-info">
                  <h4>{nextTask.title}</h4>
                  <button className="text-button" onClick={() => onToggleTask(nextTask.id)}>Mark complete</button>
                </div>
              </div>
            )}

            <div className="project-tasks-section">
              <div className="section-header">
                <h3>Active Tasks</h3>
                {!isAddingTask && userCanEditTasks && (
                  <button className="text-button" onClick={() => setIsAddingTask(true)}>+ Add Task</button>
                )}
              </div>
              
              {isAddingTask && (
                <form className="add-card mb-4" onSubmit={(e) => {
                  e.preventDefault();
                  if (!taskForm.title.trim()) return;
                  const finalRecurrence = taskForm.recurrenceFrequency !== 'none' ? {
                    seriesId: crypto.randomUUID(),
                    frequency: taskForm.recurrenceFrequency,
                    interval: Number(taskForm.recurrenceInterval) || 1,
                    weekdays: taskForm.recurrenceWeekdays,
                    endDate: taskForm.recurrenceEndDate || null,
                    status: 'active'
                  } : null;

                  onSaveProjectTask({ 
                    title: taskForm.title,
                    description: taskForm.description,
                    remindAt: taskForm.remindAt,
                    recurrence: finalRecurrence,
                    projectId: selectedProject.id,
                    assignedTo: taskForm.assignedTo || null
                  });

                  if (selectedProject.isShared) {
                    onUpdateActivities([{
                      id: crypto.randomUUID(),
                      projectId: selectedProject.id,
                      actorId: session?.email,
                      type: 'task_added',
                      metadata: { taskTitle: taskForm.title },
                      createdAt: new Date().toISOString()
                    }, ...activities]);
                  }

                  setTaskForm({ title: '', description: '', remindAt: '', recurrenceFrequency: 'none', recurrenceInterval: 1, recurrenceWeekdays: [], recurrenceEndDate: '', assignedTo: '' });
                  setIsAddingTask(false);
                }}>
                  <label><span>What needs to be done?</span>
                    <input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="e.g. Draft the homepage copy" required autoFocus />
                  </label>
                  <label><span>Assign to <i>(optional)</i></span>
                    <select value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})}>
                      <option value="">Unassigned</option>
                      <option value={selectedProject.ownerId}>{selectedProject.ownerId === session?.email ? 'You' : selectedProject.ownerId} (Owner)</option>
                      {selectedProject.members?.map(m => (
                        <option key={m.email} value={m.email}>{m.email === session?.email ? 'You' : m.email}</option>
                      ))}
                    </select>
                  </label>
                  <label><span>Remind me <i>(optional)</i></span>
                    <input type="datetime-local" value={taskForm.remindAt} onChange={e => setTaskForm({...taskForm, remindAt: e.target.value})} />
                  </label>
                  <label>
                    <span>Repeat <i>(optional)</i></span>
                    <select value={taskForm.recurrenceFrequency} onChange={e => setTaskForm({...taskForm, recurrenceFrequency: e.target.value})}>
                      <option value="none">Does not repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekdays">Every weekday</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="custom">Custom...</option>
                    </select>
                  </label>
                  {taskForm.recurrenceFrequency === 'custom' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '-8px', marginBottom: '16px' }}>
                      <label style={{ margin: 0 }}>
                        <span>Every</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input type="number" min="1" value={taskForm.recurrenceInterval} onChange={e => setTaskForm({...taskForm, recurrenceInterval: e.target.value})} style={{ width: '80px' }} />
                          <select value={taskForm.recurrenceFrequency} onChange={e => setTaskForm({...taskForm, recurrenceFrequency: e.target.value})} style={{ flex: 1, padding: '11px 12px', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--paper)', outline: 'none' }}>
                            <option value="daily">days</option>
                            <option value="weekly">weeks</option>
                            <option value="monthly">months</option>
                            <option value="yearly">years</option>
                          </select>
                        </div>
                      </label>
                    </div>
                  )}
                  {(taskForm.recurrenceFrequency === 'weekly' || (taskForm.recurrenceFrequency === 'custom' && taskForm.recurrenceFrequency === 'weekly')) && (
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>On these days</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`preset-btn ${taskForm.recurrenceWeekdays.includes(idx) ? 'active' : ''}`}
                            style={{ padding: '6px 10px', minWidth: '32px' }}
                            onClick={() => {
                              const w = taskForm.recurrenceWeekdays;
                              setTaskForm({...taskForm, recurrenceWeekdays: w.includes(idx) ? w.filter(d => d !== idx) : [...w, idx]});
                            }}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {taskForm.recurrenceFrequency !== 'none' && (
                    <label>
                      <span>Ends on <i>(optional)</i></span>
                      <input type="date" value={taskForm.recurrenceEndDate} onChange={e => setTaskForm({...taskForm, recurrenceEndDate: e.target.value})} />
                    </label>
                  )}
                  <label><span>Description <i>(optional)</i></span>
                    <textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Add some details..." />
                  </label>
                  <div className="form-actions mt-2">
                    <button className="text-button" type="button" onClick={() => setIsAddingTask(false)}>Cancel</button>
                    <button className="primary-button" type="submit">Save task</button>
                  </div>
                </form>
              )}
              
              {activeProjectTasks.length === 0 ? (
                <p className="empty-text">No active tasks in this project.</p>
              ) : (
                <div className="task-list">
                  {activeProjectTasks.map(task => (
                    <article className="task-card" key={task.id}>
                      {userCanEditTasks ? (
                        <button className="checkbox" type="button" onClick={() => onToggleTask(task.id)}><span>✓</span></button>
                      ) : (
                        <div className="checkbox" style={{ opacity: 0.5, cursor: 'not-allowed' }}></div>
                      )}
                      
                      <div className="task-content">
                        <h3 className="task-title">{task.title}</h3>
                        {task.remindAt && (
                          <p className="reminder-time">
                            ◷ {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(task.remindAt))}
                          </p>
                        )}
                        {task.recurrence && task.recurrence.frequency !== 'none' && (
                          <p className="recurrence-label" style={{ fontSize: '11px', color: 'var(--purple)', marginTop: '4px', fontWeight: 600 }}>
                            ↻ {getRecurrenceLabel(task.recurrence)}
                          </p>
                        )}
                        {overdueTasks.has(task.id) && (
                          <p className="overdue-indicator">
                            <span className="overdue-dot"></span> Overdue
                          </p>
                        )}
                        {task.assignedTo && (
                           <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', background: 'var(--paper)', padding: '3px 8px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                             <div style={{ width: 14, height: 14, borderRadius: '50%', background: getAvatarColor(task.assignedTo), color: '#fff', fontSize: '8px', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>{getAvatarInitials(task.assignedTo)}</div>
                             <span style={{ fontSize: '11px', color: 'var(--ink)', fontWeight: 600 }}>{task.assignedTo === session?.email ? 'You' : task.assignedTo.split('@')[0]}</span>
                           </div>
                        )}
                      </div>
                      
                      {userCanEditTasks && (
                        <div className="task-actions">
                          <button className="icon-button edit-button" onClick={() => onEditTask(task)}>✎</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {completedProjectTasks.length > 0 && (
                <div className="completed-section mt-4">
                  <h3>Completed</h3>
                  <div className="task-list">
                    {completedProjectTasks.map(task => (
                      <article className="task-card completed" key={task.id}>
                        {userCanEditTasks ? (
                          <button className="checkbox" type="button" onClick={() => onToggleTask(task.id)}><span>✓</span></button>
                        ) : (
                          <div className="checkbox" style={{ opacity: 0.5, cursor: 'not-allowed' }}></div>
                        )}
                        <div className="task-content">
                          <h3 className="task-title">{task.title}</h3>
                          {task.completedBy && (
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', fontWeight: 500 }}>
                              Completed by {task.completedBy === session?.email ? 'You' : task.completedBy.split('@')[0]}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'activity' && (
          <div className="activity-feed">
             {activities.filter(a => a.projectId === selectedProject.id).map(act => (
                <div key={act.id} style={{ display: 'flex', gap: '14px', padding: '16px', marginBottom: '8px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(act.actorId), color: '#fff', fontSize: '10px', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 'bold' }}>
                    {getAvatarInitials(act.actorId)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '13px' }}>{act.actorId === session?.email ? 'You' : act.actorId?.split('@')[0]}</span>
                    {' '}
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                      {act.type === 'member_invited' && `invited ${act.metadata.targetEmail} as ${act.metadata.role}`}
                      {act.type === 'task_completed' && `completed task "${act.metadata.taskTitle}"`}
                      {act.type === 'task_added' && `added task "${act.metadata.taskTitle}"`}
                    </span>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', fontWeight: 600 }}>
                      {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(act.createdAt))}
                    </div>
                  </div>
                </div>
             ))}
             {activities.filter(a => a.projectId === selectedProject.id).length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>No activity yet.</p>
             )}
          </div>
        )}

        {showShareModal && (
          <ProjectShareModal
            project={selectedProject}
            session={session}
            activities={activities}
            onUpdateActivities={onUpdateActivities}
            onUpdateProject={p => { onSaveProject(p); }}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </section>
    );
  }

  return null;
}
