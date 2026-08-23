import { useState } from 'react';
import { repository } from './data/repository';

export default function SettingsView({ 
  session,
  activeTab,
  setActiveTab,
  priorities, 
  onSavePriority, 
  onDeletePriority,
  onReorderPriorities,
  rules,
  onSaveRule,
  onDeleteRule,
  tasks,
  tags,
  setTags,
  savedViews,
  setSavedViews,
  animatedBackground,
  onToggleAnimatedBackground,
  onShowPrivacyPolicy,
  onBulkUpdateTasks
}) {
  const [editingPriorityId, setEditingPriorityId] = useState(null);
  const [editingTagId, setEditingTagId] = useState(null);
  const [priorityForm, setPriorityForm] = useState({ name: '', icon: '🚨', color: '#ffcdd2' });
  const [ruleForm, setRuleForm] = useState({ conditionField: 'title', conditionValue: '', actionType: 'priority', priorityId: '', tagId: '' });
  const [tagForm, setTagForm] = useState({ name: '', icon: '🏷️', color: '#e0e0e0' });

  const handleSavePriority = (e) => {
    e.preventDefault();
    if (!priorityForm.name.trim()) return;
    
    if (editingPriorityId) {
      onSavePriority({ id: editingPriorityId, ...priorityForm });
    } else {
      onSavePriority({
        id: crypto.randomUUID(),
        ...priorityForm,
      });
    }
    setEditingPriorityId(null);
    setPriorityForm({ name: '', icon: '🚨', color: '#ffcdd2' });
  };

  const handleSaveTag = (e) => {
    e.preventDefault();
    const cleanName = tagForm.name.trim().toLowerCase().replace(/^#/, '');
    if (!cleanName) return;

    if (editingTagId) {
      const oldTag = tags.find(t => t.id === editingTagId);
      const existingTagWithSameName = tags.find(t => t.id !== editingTagId && t.name === cleanName);

      if (existingTagWithSameName) {
        // Merge into existing tag
        setTags(tags.filter(t => t.id !== editingTagId));
        // Update historical tasks
        const updatedTasks = tasks.map(task => {
          if (task.tags && task.tags.includes(oldTag.name)) {
            const newTags = new Set(task.tags.filter(t => t !== oldTag.name));
            newTags.add(cleanName);
            return { ...task, tags: Array.from(newTags) };
          }
          return task;
        });
        onBulkUpdateTasks(updatedTasks);
      } else {
        // Rename tag
        setTags(tags.map(t => t.id === editingTagId ? { ...t, name: cleanName, icon: tagForm.icon, color: tagForm.color } : t));
        if (oldTag.name !== cleanName) {
          const updatedTasks = tasks.map(task => {
            if (task.tags && task.tags.includes(oldTag.name)) {
              return { ...task, tags: task.tags.map(t => t === oldTag.name ? cleanName : t) };
            }
            return task;
          });
          onBulkUpdateTasks(updatedTasks);
        }
      }
    } else {
      const existing = tags.find(t => t.name === cleanName);
      if (!existing) {
        setTags([...tags, { id: crypto.randomUUID(), name: cleanName, icon: tagForm.icon, color: tagForm.color }]);
      }
    }
    setEditingTagId(null);
    setTagForm({ name: '', icon: '🏷️', color: '#e0e0e0' });
  };

  const handleSaveRule = (e) => {
    e.preventDefault();
    if (!ruleForm.conditionValue.trim()) return;
    if (ruleForm.actionType === 'priority' && !ruleForm.priorityId) return;
    if (ruleForm.actionType === 'tag' && !ruleForm.tagId) return;
    onSaveRule({ id: crypto.randomUUID(), ...ruleForm });
    setRuleForm({ conditionField: 'title', conditionValue: '', actionType: 'priority', priorityId: '', tagId: '' });
  };

  // Drag and Drop for priorities
  const [draggedPriorityIdx, setDraggedPriorityIdx] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedPriorityIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedPriorityIdx === null || draggedPriorityIdx === index) return;
    
    const newPriorities = [...priorities];
    const draggedItem = newPriorities[draggedPriorityIdx];
    
    newPriorities.splice(draggedPriorityIdx, 1);
    newPriorities.splice(index, 0, draggedItem);
    
    setDraggedPriorityIdx(index);
    onReorderPriorities(newPriorities);
  };

  // Analytics Calculation
  const sortedPriorities = [...priorities].sort((a, b) => a.rank - b.rank);
  const topPriority = sortedPriorities[0];
  
  const topPriorityTasks = tasks.filter(t => !t.completed && t.priority === topPriority?.id);
  const agingTasks = topPriorityTasks.filter(t => {
    const ageInMs = Date.now() - new Date(t.createdAt).getTime();
    const days = ageInMs / (1000 * 60 * 60 * 24);
    return days >= 3;
  });

  return (
    <section className="settings-view">
      <header className="settings-header">
        <h2>Settings</h2>
        <div className="settings-tabs">
          <button className={`tab-btn ${activeTab === 'priorities' ? 'active' : ''}`} onClick={() => setActiveTab('priorities')}>Priorities</button>
          <button className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}>Tags</button>
          <button className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>Auto Rules</button>
          <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Insights</button>
          <button className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>Appearance</button>
          <button className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>Account</button>
        </div>
      </header>

      {activeTab === 'priorities' && (
        <div className="settings-section">
          <h3>Custom Priorities</h3>
          <p className="settings-desc">Drag to reorder hierarchy. The top item is your highest priority.</p>
          
          <ul className="priority-list">
            {sortedPriorities.map((p, index) => (
              <li 
                key={p.id} 
                className="priority-item"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={() => setDraggedPriorityIdx(null)}
              >
                <div className="priority-drag-handle">≡</div>
                <div className="priority-badge-preview" style={{ '--badge-color': p.color }}>
                  {p.icon} {p.name}
                </div>
                <div className="priority-actions">
                  <button className="icon-button" onClick={() => {
                    setEditingPriorityId(p.id);
                    setPriorityForm({ name: p.name, icon: p.icon, color: p.color });
                  }}>✎</button>
                  <button className="icon-button" onClick={() => onDeletePriority(p.id)}>🗑</button>
                </div>
              </li>
            ))}
          </ul>

          <form className="add-card mt-4" onSubmit={handleSavePriority}>
            <h4>{editingPriorityId ? 'Edit Priority' : 'Add Priority'}</h4>
            <div className="form-row-2">
              <label><span>Name</span><input value={priorityForm.name} onChange={e => setPriorityForm({...priorityForm, name: e.target.value})} placeholder="e.g. Critical" required /></label>
              <label><span>Icon</span><input value={priorityForm.icon} onChange={e => setPriorityForm({...priorityForm, icon: e.target.value})} maxLength="2" /></label>
            </div>
            <label><span>Brand Color</span>
              <input type="color" value={priorityForm.color} onChange={e => setPriorityForm({...priorityForm, color: e.target.value})} className="color-picker" />
            </label>
            <div className="form-actions">
              {editingPriorityId && <button className="text-button" type="button" onClick={() => { setEditingPriorityId(null); setPriorityForm({ name: '', icon: '🚨', color: '#ffcdd2' }); }}>Cancel</button>}
              <button className="primary-button" type="submit">{editingPriorityId ? 'Save' : 'Add Priority'}</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="settings-section">
          <section className="mb-6">
            <h3>Manage Tags</h3>
            <p className="settings-desc">Customize your tag colors and icons. Renaming a tag will update all existing tasks.</p>
            <ul className="priority-list">
              {tags.map(t => (
                <li key={t.id} className="priority-item">
                  <div className="priority-badge-preview" style={{ '--badge-color': t.color }}>
                    {t.icon} #{t.name}
                  </div>
                  <div className="priority-actions">
                    <button 
                      className="icon-button" 
                      onClick={() => {
                        if (savedViews.find(v => v.tagId === t.id)) {
                          setSavedViews(savedViews.filter(v => v.tagId !== t.id));
                        } else {
                          setSavedViews([...savedViews, { id: crypto.randomUUID(), tagId: t.id }]);
                        }
                      }}
                      title="Pin to sidebar"
                    >
                      {savedViews.find(v => v.tagId === t.id) ? '📌' : '📍'}
                    </button>
                    <button className="icon-button" onClick={() => { setEditingTagId(t.id); setTagForm({ name: t.name, icon: t.icon, color: t.color }); }}>✎</button>
                    <button className="icon-button" onClick={() => {
                      setTags(tags.filter(x => x.id !== t.id));
                      setSavedViews(savedViews.filter(v => v.tagId !== t.id));
                    }} style={{ color: '#ff4757' }}>✕</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          
          <section>
            <h3>{editingTagId ? 'Edit Tag' : 'New Tag'}</h3>
            <form className="add-card" onSubmit={handleSaveTag}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px', gap: '8px' }}>
                <label><span>Name (without #)</span>
                  <input value={tagForm.name} onChange={e => setTagForm({ ...tagForm, name: e.target.value })} required placeholder="e.g. urgent" />
                </label>
                <label><span>Icon</span>
                  <input value={tagForm.icon} onChange={e => setTagForm({ ...tagForm, icon: e.target.value })} />
                </label>
                <label><span>Color</span>
                  <input type="color" value={tagForm.color} onChange={e => setTagForm({ ...tagForm, color: e.target.value })} style={{ width: '100%', height: '42px', padding: 0 }} />
                </label>
              </div>
              <div className="form-actions mt-4">
                {editingTagId && <button className="text-button" type="button" onClick={() => { setEditingTagId(null); setTagForm({ name: '', icon: '🏷️', color: '#e0e0e0' }); }}>Cancel</button>}
                <button className="primary-button" type="submit">Save</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="settings-section">
          <h3>Auto-Apply Rules</h3>
          <p className="settings-desc">Automatically assign priorities or tags based on keywords.</p>

          <ul className="rules-list">
            {rules.map(rule => {
              const priority = priorities.find(p => p.id === rule.priorityId);
              const tag = tags.find(t => t.id === rule.tagId);
              return (
                <li key={rule.id} className="rule-item">
                  <div className="rule-content">
                    If <strong>{rule.conditionField}</strong> contains <strong>"{rule.conditionValue}"</strong> 
                    → {rule.actionType === 'tag' ? (
                       <span>Apply Tag <span className="priority-badge-preview" style={{ '--badge-color': tag?.color || 'var(--muted)', fontSize: '12px', padding: '2px 6px' }}>{tag?.icon || '🏷️'} {tag?.name || 'Unknown'} ✨</span></span>
                    ) : (
                       <span>Set to <span style={{ color: priority?.color }}>{priority?.name || 'Unknown'}</span></span>
                    )}
                  </div>
                  <button className="icon-button" onClick={() => onDeleteRule(rule.id)}>🗑</button>
                </li>
              );
            })}
          </ul>

          <form className="add-card mt-4" onSubmit={handleSaveRule}>
            <h4>Create Rule</h4>
            <div className="advanced-options-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <label><span>If</span>
                <select value={ruleForm.conditionField} onChange={e => setRuleForm({...ruleForm, conditionField: e.target.value})}>
                  <option value="title">Title</option>
                  <option value="tags">Tag</option>
                </select>
              </label>
              <label><span>Contains</span>
                <input value={ruleForm.conditionValue} onChange={e => setRuleForm({...ruleForm, conditionValue: e.target.value})} placeholder="e.g. urgent" required />
              </label>
              <label><span>Action Type</span>
                <select value={ruleForm.actionType || 'priority'} onChange={e => setRuleForm({...ruleForm, actionType: e.target.value})}>
                  <option value="priority">Set Priority</option>
                  <option value="tag">Apply Tag</option>
                </select>
              </label>
              <label style={{ gridColumn: 'span 3' }}><span>{ruleForm.actionType === 'tag' ? 'Apply Tag' : 'Set Priority To'}</span>
                {ruleForm.actionType === 'tag' ? (
                  <select value={ruleForm.tagId} onChange={e => setRuleForm({...ruleForm, tagId: e.target.value})} required>
                    <option value="">Select tag...</option>
                    {tags.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                  </select>
                ) : (
                  <select value={ruleForm.priorityId} onChange={e => setRuleForm({...ruleForm, priorityId: e.target.value})} required>
                    <option value="">Select priority...</option>
                    {sortedPriorities.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                  </select>
                )}
              </label>
            </div>
            <div className="form-actions mt-2">
              <button className="primary-button" type="submit">Add Rule</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="settings-section">
          <h3>Insights & Aging</h3>
          <p className="settings-desc">Monitor task health and prevent high-priority items from turning stale.</p>

          <div className="insight-card">
            <h4>High-Priority Aging</h4>
            <div className="insight-stat">
              <span className="stat-number" style={{ color: agingTasks.length > 0 ? '#ff4757' : 'var(--muted)' }}>{agingTasks.length}</span>
              <span className="stat-label">"{topPriority?.name || 'Top Priority'}" tasks older than 3 days</span>
            </div>
            {agingTasks.length > 0 && (
              <div className="aging-tasks-list mt-2">
                {agingTasks.map(t => (
                  <div key={t.id} className="aging-task-item">
                    <span>{t.title}</span>
                    <small>{Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days old</small>
                  </div>
                ))}
              </div>
            )}
            {agingTasks.length === 0 && (
              <p className="success-text mt-2">Great job! No stale critical tasks.</p>
            )}
          </div>
        </div>
      )}
      {activeTab === 'appearance' && (
        <div className="settings-section">
          <h3>Appearance</h3>
          <p className="settings-desc">Customize the look and feel of your workspace.</p>

          <div className="insight-card">
            <h4 style={{ marginBottom: '8px' }}>Animated Background</h4>
            <p className="settings-desc" style={{ marginBottom: '16px' }}>
              Disable this for better battery life and performance. A lightweight gradient will be used instead.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={animatedBackground} 
                onChange={(e) => onToggleAnimatedBackground(e.target.checked)} 
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Enable Animated Background</span>
            </label>
          </div>
        </div>
      )}
      {activeTab === 'account' && (
        <div className="settings-section">
          <h3>Data & Account</h3>
          <p className="settings-desc">Manage your data portability and account settings.</p>

          <div className="insight-card" style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>Export Data</h4>
            <p className="settings-desc" style={{ marginBottom: '16px' }}>
              Download a complete JSON backup of all your tasks, projects, tags, and settings.
            </p>
            <button className="primary-button" onClick={() => repository.exportData()}>Export My Data (JSON)</button>
          </div>

          <div className="insight-card" style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>Legal</h4>
            <p className="settings-desc" style={{ marginBottom: '16px' }}>
              Review our privacy practices and data handling policies.
            </p>
            <button className="primary-button" style={{ background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'none' }} onClick={onShowPrivacyPolicy}>View Privacy Policy</button>
          </div>

          {session?.isGuest ? (
            <div className="insight-card" style={{ border: '1px solid color-mix(in srgb, #ff4757 30%, transparent)', background: 'color-mix(in srgb, #ff4757 5%, var(--paper))' }}>
              <h4 style={{ color: '#ff4757', marginBottom: '8px' }}>Guest Mode</h4>
              <p className="settings-desc" style={{ marginBottom: '16px' }}>
                Your data is stored only on this device. It will not sync to the cloud.
              </p>
              <button 
                className="primary-button" 
                style={{ background: '#ff4757', boxShadow: 'none' }} 
                onClick={() => {
                  if (window.confirm("Are you absolutely sure you want to clear your local guest data? This cannot be undone.")) {
                    repository.clearGuestData();
                  }
                }}
              >
                Clear Guest Data & Sign Out
              </button>
            </div>
          ) : (
            <div className="insight-card" style={{ border: '1px solid color-mix(in srgb, #ff4757 30%, transparent)', background: 'color-mix(in srgb, #ff4757 5%, var(--paper))' }}>
              <h4 style={{ color: '#ff4757', marginBottom: '8px' }}>Danger Zone</h4>
              <p className="settings-desc" style={{ marginBottom: '16px' }}>
                Permanently delete all your local and cloud data. This action cannot be undone.
              </p>
              <button 
                className="primary-button" 
                style={{ background: '#ff4757', boxShadow: 'none' }} 
                onClick={() => {
                  if (window.confirm("Are you absolutely sure you want to permanently delete your account and all associated data?")) {
                    repository.deleteAccount();
                  }
                }}
              >
                Delete Account & Data
              </button>
            </div>
          )}
        </div>
      )}

    </section>
  );
}
