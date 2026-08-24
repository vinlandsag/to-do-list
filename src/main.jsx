import React, { Suspense, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// ─── Polyfill for crypto.randomUUID in older WebViews ───
if (!window.crypto) {
  window.crypto = {};
}
if (!window.crypto.randomUUID) {
  window.crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

const Ballpit = React.lazy(() => import('./Ballpit.jsx'));
import ThemeToggle from './ThemeToggle.jsx';
import LoginPage from './LoginPage.jsx';
import ToastStack from './ToastStack.jsx';
import NotificationCenter from './NotificationCenter.jsx';
import PrivacyPolicy from './PrivacyPolicy.jsx';
import useNotifications, { requestNotificationPermission } from './useNotifications.jsx';
import CalendarView from './CalendarView.jsx';
import ProjectsView from './ProjectsView.jsx';
import SettingsView from './SettingsView.jsx';
import FocusView from './FocusView.jsx';
import FloatingTimerWidget from './FloatingTimerWidget.jsx';
import RecurringTasksView from './RecurringTasksView.jsx';
import { getRecurrenceLabel, getNextOccurrenceDate, generateNextTaskOccurrence } from './utils/recurrence.js';
import { migrateToCollaborationModel } from './utils/collaboration.js';
import '../styles.css';

import { repository } from './data/repository.js';

function fuzzyMatch(pattern, str) {
  let pIdx = 0, sIdx = 0;
  while (pIdx < pattern.length && sIdx < str.length) {
    if (pattern[pIdx].toLowerCase() === str[sIdx].toLowerCase()) {
      pIdx++;
    }
    sIdx++;
  }
  return pIdx === pattern.length;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
    }
  }
  return dp[m][n];
}

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined, hour: 'numeric', minute: '2-digit' });
}

// Detect if running inside a Capacitor native WebView
const isCapacitorNative = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

function getAnimatedBgDefault() {
  if (typeof window === 'undefined') return false;
  if (isCapacitorNative) return false;
  const isMobile = window.innerWidth < 768;
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasLowConcurrency = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
  if (isMobile || isReducedMotion || hasLowConcurrency || hasLowMemory) return false;
  return true;
}

function App() {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [session, setSession] = useState(null);
  const [animatedBackground, setAnimatedBackground] = useState(getAnimatedBgDefault);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [priorities, setPriorities] = useState([]);
  const [rules, setRules] = useState([]);
  const [tags, setTags] = useState([]);
  const [savedViews, setSavedViews] = useState([]);
  const [listType, setListType] = useState('tasks');
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  useEffect(() => {
    async function loadData() {
      const [
        sess, animBg, loadedTasks, loadedProjects,
        loadedPriorities, loadedRules, loadedTags,
        loadedViews, loadedActivities
      ] = await Promise.all([
        repository.getSession(),
        repository.getAnimatedBg(),
        repository.getTasks(),
        repository.getProjects(),
        repository.getPriorities(),
        repository.getRules(),
        repository.getTags(),
        repository.getSavedViews(),
        repository.getActivities()
      ]);

      setSession(sess);
      setAnimatedBackground(isCapacitorNative ? false : animBg);
      setTasks(loadedTasks);
      setProjects(loadedProjects);
      setPriorities(loadedPriorities);
      setRules(loadedRules);
      setTags(loadedTags);
      setSavedViews(loadedViews);
      setActivities(loadedActivities);

      // Start Realtime Subscription if we have a non-guest session
      if (sess && !sess.isGuest) {
        repository.subscribeToChanges(async (table, payload) => {
          if (table === 'tasks') {
            const updatedTasks = await repository.getTasks();
            setTasks([...updatedTasks]); // clone to force React re-render just in case
          } else if (table === 'projects') {
            const updatedProjects = await repository.getProjects();
            setProjects([...updatedProjects]);
          }
        });
      }
      setDataLoaded(true);
    }
    loadData();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      repository.unsubscribeFromChanges();
    };
  }, []);

  const toggleAnimatedBackground = (val) => {
    setAnimatedBackground(val);
    repository.saveAnimatedBg(val);
  };
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= 760
  );
  const [homeFormOpen, setHomeFormOpen] = useState(() =>
    typeof window === 'undefined' || window.innerWidth > 760
  );
  
  /* ─── PWA Install Prompt ─── */
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  /* Keep isMobileViewport in sync with viewport changes (resize/rotation) */
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 760px)');
    const handler = (e) => {
      setIsMobileViewport(e.matches);
      if (!e.matches) setHomeFormOpen(true);   // desktop: always show form
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  const [filter, setFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [settingsTab, setSettingsTab] = useState('priorities');
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [bulkTagsToAdd, setBulkTagsToAdd] = useState(new Set());
  const [activities, setActivities] = useState([]);

  // Run migration when session is loaded
  useEffect(() => {
    if (session && dataLoaded) {
      const { projectsChanged, nextProjects, tasksChanged, nextTasks } = migrateToCollaborationModel(projects, tasks, session.email);
      if (projectsChanged) {
        setProjects(nextProjects);
        repository.saveProjects(nextProjects);
      }
      if (tasksChanged) {
        setTasks(nextTasks);
        repository.saveTasks(nextTasks);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, dataLoaded]);

  useEffect(() => {
    if (dataLoaded) repository.saveTags(tags);
  }, [tags, dataLoaded]);

  useEffect(() => {
    if (dataLoaded) repository.saveSavedViews(savedViews);
  }, [savedViews, dataLoaded]);

  /* ─── Global Focus Timer ─── */
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = React.useRef(null);
  const hasAlerted5Min = React.useRef(false);

  React.useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === 301 && !hasAlerted5Min.current) {
            hasAlerted5Min.current = true;
            if (window.Notification && Notification.permission === 'granted') {
              new Notification("Almost done!", { body: "5 minutes remaining in your focus session." });
            }
          }

          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            if (window.Notification && Notification.permission === 'granted') {
              new Notification("Focus Session Complete", { body: "Time to take a break!" });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const toggleTimer = React.useCallback(() => setIsRunning(prev => !prev), []);
  const setTimer = React.useCallback((mins) => {
    setIsRunning(false);
    setTimerDuration(mins * 60);
    setTimeLeft(mins * 60);
    hasAlerted5Min.current = false;
  }, []);

  const today = useMemo(() => new Date(), []);
  const currentTasks = tasks.filter(task => (task.type || 'tasks') === listType && !task.projectId);
  const visibleTasks = currentTasks.filter(task => {
    const matchesStatus = filter === 'all' || (filter === 'completed' ? task.completed : !task.completed);
    const matchesTag = tagFilter ? task.tags?.some(t => t === tagFilter || t.startsWith(tagFilter + '/')) : true;
    return matchesStatus && matchesTag;
  });

  const visibleProjects = useMemo(() => {
    if (!session) return [];
    return projects.filter(p => p.ownerId === session.email || (p.members && p.members.some(m => m.email === session.email && m.inviteStatus !== 'declined')));
  }, [projects, session]);

  const persist = useCallback((nextTasks) => {
    setTasks(nextTasks);
    repository.saveTasks(nextTasks);
  }, []);

  const persistProjects = useCallback((nextProjects) => {
    setProjects(nextProjects);
    repository.saveProjects(nextProjects);
  }, []);

  const persistPriorities = useCallback((nextPriorities) => {
    setPriorities(nextPriorities);
    repository.savePriorities(nextPriorities);
  }, []);

  const persistRules = useCallback((nextRules) => {
    setRules(nextRules);
    repository.saveRules(nextRules);
  }, []);

  const persistActivities = useCallback((nextActivities) => {
    setActivities(nextActivities);
    repository.saveActivities(nextActivities);
  }, []);

  const resetForm = () => { setEditingId(null); setTitle(''); setDescription(''); setRemindAt(''); setProjectId(''); setPriority(''); setTagInput(''); setShowAdvanced(false); setRecurrenceFrequency('none'); setRecurrenceInterval(1); setRecurrenceWeekdays([]); setRecurrenceEndDate(''); };

  /* ─── Notification system ─── */
  const { toasts, notifications, unreadCount, overdueTasks, markRead, markAllRead, clearNotifications, dismissToast, snoozeTask, completeTaskFromToast } = useNotifications(tasks, persist, activities, session);

  const [tagAutocomplete, setTagAutocomplete] = useState({ active: false, query: '' });
  const taskTitleInputRef = useRef(null);

  useEffect(() => {
    if (homeFormOpen && window.matchMedia('(max-width: 760px)').matches) {
      taskTitleInputRef.current?.focus();
    }
  }, [homeFormOpen, listType]);

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);

    const match = val.match(/(?:^|\s)#([\w-]*)$/);
    if (match) {
      setTagAutocomplete({ active: true, query: match[1].toLowerCase() });
    } else {
      setTagAutocomplete({ active: false, query: '' });
    }
  };

  const handleTagAutocompleteSelect = (tagName) => {
    setTitle(prev => prev.replace(/(?:^|\s)#([\w-]*)$/, ` #${tagName} `));
    setTagAutocomplete({ active: false, query: '' });
  };

  const saveTask = event => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    let finalTitle = trimmedTitle;
    let extractedTags = [];
    const tagRegex = /#([\w-]+)/g;
    let match;
    while ((match = tagRegex.exec(finalTitle)) !== null) {
      extractedTags.push(match[1].toLowerCase());
    }
    finalTitle = finalTitle.replace(tagRegex, '').replace(/\s+/g, ' ').trim();

    if (!finalTitle) finalTitle = "Untitled Task";

    let finalRemindAt = listType === 'reminders' ? (remindAt || null) : null;

    if (finalRemindAt) {
      requestNotificationPermission();
    }

    let finalPriority = priority || null;
    let finalTags = new Set(extractedTags);

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        let matches = false;
        if (rule.conditionField === 'title' && finalTitle.toLowerCase().includes(rule.conditionValue.toLowerCase())) {
          matches = true;
        } else if (rule.conditionField === 'tags' && Array.from(finalTags).some(t => t.toLowerCase().includes(rule.conditionValue.toLowerCase()))) {
          matches = true;
        }

        if (matches) {
          if (rule.actionType === 'tag') {
            const tagToApply = tags.find(t => t.id === rule.tagId);
            if (tagToApply) {
              finalTags.add(tagToApply.name);
            }
          } else {
            finalPriority = rule.priorityId || finalPriority;
          }
        }
      }
    }
    extractedTags = Array.from(finalTags);

    let finalRecurrence = null;
    if (recurrenceFrequency !== 'none') {
      finalRecurrence = {
        seriesId: editingId && tasks.find(t => t.id === editingId)?.recurrence?.seriesId || crypto.randomUUID(),
        frequency: recurrenceFrequency,
        interval: Number(recurrenceInterval) || 1,
        weekdays: recurrenceWeekdays,
        endDate: recurrenceEndDate || null,
        status: 'active'
      };
    }

    const nextTasks = editingId
      ? tasks.map(task => task.id === editingId ? { ...task, title: finalTitle, description: description.trim(), remindAt: finalRemindAt, projectId: projectId || null, priority: finalPriority, tags: extractedTags, recurrence: finalRecurrence } : task)
      : [{ id: crypto.randomUUID(), type: listType, title: finalTitle, description: description.trim(), remindAt: finalRemindAt, projectId: projectId || null, priority: finalPriority, tags: extractedTags, recurrence: finalRecurrence, createdAt: new Date().toISOString(), completed: false, completedAt: null }, ...tasks];
    persist(nextTasks);
    resetForm();
    setTagAutocomplete({ active: false, query: '' });
    setHomeFormOpen(false);
  };

  const toggleTask = id => {
    let nextTasks = [...tasks];
    const taskIndex = nextTasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const task = nextTasks[taskIndex];
    const isCompleting = !task.completed;

    nextTasks[taskIndex] = {
      ...task,
      completed: isCompleting,
      completedAt: isCompleting ? new Date().toISOString() : null,
      completedBy: isCompleting ? (session?.email || null) : null
    };

    if (isCompleting && task.recurrence && task.recurrence.status !== 'paused' && task.recurrence.status !== 'ended') {
      const nextDate = getNextOccurrenceDate(task.recurrence, task.remindAt || task.createdAt || new Date());
      if (nextDate) {
        const nextOccurrence = generateNextTaskOccurrence(nextTasks[taskIndex], nextDate);
        nextTasks = [nextOccurrence, ...nextTasks];
      }
    }

    if (isCompleting && task.projectId) {
      const project = projects.find(p => p.id === task.projectId);
      if (project && project.isShared) {
        const newActivity = {
          id: crypto.randomUUID(),
          projectId: task.projectId,
          actorId: session?.email,
          type: 'task_completed',
          taskId: task.id,
          createdAt: new Date().toISOString(),
          metadata: { taskTitle: task.title }
        };
        persistActivities([newActivity, ...activities]);
      }
    }

    persist(nextTasks);
  };
  const deleteTask = id => { persist(tasks.filter(task => task.id !== id)); if (editingId === id) resetForm(); };
  const startEditing = task => {
    setHomeFormOpen(true);
    setEditingId(task.id);
    const tagString = (task.tags && task.tags.length > 0) ? ` ${task.tags.map(t => `#${t}`).join(' ')}` : '';
    setTitle(task.title + tagString);
    setDescription(task.description);
    setRemindAt(task.remindAt || '');
    setProjectId(task.projectId || '');
    setPriority(task.priority || '');
    if (task.recurrence) {
      setRecurrenceFrequency(task.recurrence.frequency || 'none');
      setRecurrenceInterval(task.recurrence.interval || 1);
      setRecurrenceWeekdays(task.recurrence.weekdays || []);
      setRecurrenceEndDate(task.recurrence.endDate || '');
    } else {
      setRecurrenceFrequency('none');
      setRecurrenceInterval(1);
      setRecurrenceWeekdays([]);
      setRecurrenceEndDate('');
    }
    if (task.projectId || task.priority || (task.recurrence && task.recurrence.frequency !== 'none')) setShowAdvanced(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const switchList = type => { setListType(type); setFilter('all'); resetForm(); setHomeFormOpen(false); };

  const handleLogin = (sessionData) => {
    setSession(sessionData);
  };

  const handleLogout = () => {
    repository.clearSession();
    setSession(null);
  };

  /* ─── Show loading state if data not hydrated ─── */
  if (!dataLoaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', background: 'var(--cream)' }}>
        <div className="login-logo-circle" style={{ width: '64px', height: '64px', fontSize: '32px', marginBottom: '20px', animation: 'loginOrbFloat 3s ease-in-out infinite' }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.03em' }}>Flowlist</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>Loading workspace...</div>
      </div>
    );
  }

  /* ─── Show Privacy Policy ─── */
  if (showPrivacyPolicy) {
    return <PrivacyPolicy onBack={() => setShowPrivacyPolicy(false)} />;
  }

  /* ─── Show login page if not authenticated ─── */
  if (!session) {
    return <LoginPage onLogin={handleLogin} onShowPrivacyPolicy={() => setShowPrivacyPolicy(true)} />;
  }

  const handleTaskPointerDown = (e, taskId) => {
    // Only drag if grabbing the empty area or explicitly the card, not buttons
    if (e.target.closest('button, input, textarea, a, .checkbox')) return;
    setDraggedTaskId(taskId);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTaskPointerEnter = (e, hoverTargetId) => {
    if (draggedTaskId === null || draggedTaskId === hoverTargetId) return;

    const dragIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const dropIndex = tasks.findIndex(t => t.id === hoverTargetId);

    if (dragIndex === -1 || dropIndex === -1) return;

    const nextTasks = [...tasks];
    const draggedItem = nextTasks.splice(dragIndex, 1)[0];
    nextTasks.splice(dropIndex, 0, draggedItem);

    persist(nextTasks);
    // Don't setDraggedTaskId(null) yet, user is still dragging
  };

  const handleTaskPointerUp = (e) => {
    setDraggedTaskId(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  /* ─── Show login page if not authenticated ─── */
  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  /* ─── Main app (authenticated) ─── */
  return <>
    {animatedBackground ? (
      <Suspense fallback={null}>
        <div className="ballpit-container" aria-hidden="true">
          <Ballpit
            count={typeof window !== 'undefined' && window.innerWidth < 768 ? 15 : 60}
            colors={[0x6254e7, 0x9e90ff, 0x8ac6ff, 0xf5b267, 0xffb7a4]}
            radiusCm={1}
            gravity={0}
            friction={0.94}
            wallBounce={0.95}
            maxVelocity={0.65}
            cursorForce={8}
            followCursor={typeof window !== 'undefined' && window.innerWidth >= 768}
          />
        </div>
      </Suspense>
    ) : (
      <div className="css-orbs-background" aria-hidden="true">
        <div className="orb-1"></div>
        <div className="orb-2"></div>
        <div className="orb-3"></div>
      </div>
    )}
    <aside id="main-navigation" className={`side-nav${sidebarOpen ? ' is-open' : ''}`} aria-label="Main navigation">
      <div className="side-nav-top">
        <button className="side-nav-brand" type="button" onClick={() => setSidebarOpen(false)} aria-label="Flowlist home">
          <span className="side-nav-logo">✓</span>
          <span className="side-nav-brand-name">Flowlist</span>
        </button>
        <button className="side-nav-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button>
      </div>

      <nav className="side-nav-links">
        <p className="side-nav-label">Workspace</p>
        <button className={`side-nav-link ${currentView === 'home' && !tagFilter ? 'active' : ''}`} type="button" onClick={() => { setCurrentView('home'); setTagFilter(null); setSidebarOpen(false); }}>
          <span className="side-nav-icon">⌂</span><span>Home</span>
        </button>
        <button className={`side-nav-link ${currentView === 'calendar' ? 'active' : ''}`} type="button" onClick={() => { setCurrentView('calendar'); setSidebarOpen(false); }}>
          <span className="side-nav-icon">□</span><span>Calendar</span>
        </button>
        <button className={`side-nav-link ${currentView === 'projects' ? 'active' : ''}`} type="button" onClick={() => { setCurrentView('projects'); setSidebarOpen(false); }}>
          <span className="side-nav-icon">▣</span><span>Projects</span>
        </button>
        <button className={`side-nav-link ${currentView === 'recurring' ? 'active' : ''}`} type="button" onClick={() => { setCurrentView('recurring'); setSidebarOpen(false); }}>
          <span className="side-nav-icon">↻</span><span>Recurring</span>
        </button>

        <p className="side-nav-label side-nav-label-tools">Tools</p>
        <button className={`side-nav-link ${currentView === 'focus' ? 'active' : ''}`} type="button" onClick={() => { setCurrentView('focus'); setSidebarOpen(false); }}>
          <span className="side-nav-icon">◎</span><span>Focus Mode</span>
        </button>
        {savedViews.map(view => {
          const t = tags.find(tag => tag.id === view.tagId);
          if (!t) return null;
          return (
            <button key={view.id} className={`side-nav-link ${currentView === 'home' && tagFilter === t.name ? 'active' : ''}`} type="button" onClick={() => { setCurrentView('home'); setTagFilter(t.name); setSidebarOpen(false); }}>
              <span className="side-nav-icon" style={{ color: t.color }}>{t.icon || '#'}</span><span>{t.name}</span>
            </button>
          );
        })}
        {savedViews.length === 0 && (
          <button className="side-nav-link" type="button" onClick={() => { setSettingsTab('tags'); setCurrentView('settings'); setSidebarOpen(false); }}>
            <span className="side-nav-icon">#</span><span>Tags</span><small>Add in Settings</small>
          </button>
        )}
      </nav>
      <div className="side-nav-bottom">
        <button className={`side-nav-link ${currentView === 'settings' ? 'active' : ''}`} type="button" onClick={() => { setCurrentView('settings'); setSidebarOpen(false); }}>
          <span className="side-nav-icon">⚙</span><span>Settings</span>
        </button>
        {deferredPrompt && (
          <button className="side-nav-link install-link" type="button" onClick={handleInstallClick}>
            <span className="side-nav-icon">⬇</span><span>Install App</span>
          </button>
        )}
        <button className="side-nav-link signout-link" type="button" onClick={handleLogout}>
          <span className="side-nav-icon">⎋</span><span>Sign out</span>
        </button>
      </div>
    </aside>
    {sidebarOpen && <button className="side-nav-scrim" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}
    <main className="app-shell">
      <button className="menu-toggle" type="button" onClick={() => setSidebarOpen(true)} aria-expanded={sidebarOpen} aria-controls="main-navigation" aria-label="Open menu">
        <span /><span /><span />
      </button>
      <ThemeToggle />
      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow"><span /> YOUR DAY, ORGANIZED</p>
          <h1 id="page-title">Make space for<br /><em>what matters.</em></h1>
          <div className="hero-copy">
            <p>Choose a simple to-do list or plan the things you need to remember.</p>
          </div>
          <div className="hero-actions">
            <p className="user-greeting">Hello, <strong>{session.name}</strong></p>
            {isOffline && (
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'color-mix(in srgb, #f5b267 20%, transparent)', color: '#d98c30', padding: '4px 8px', borderRadius: '8px', marginLeft: '8px' }}>
                OFFLINE
              </span>
            )}
            <NotificationCenter
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              onClear={clearNotifications}
            />
            {!isMobileViewport && (
              <button className="logout-button" type="button" onClick={handleLogout}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            )}
          </div>
        </div>
        <div className="today-card" aria-label="Today's date">
          <span>{new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(today)}</span>
          <strong>{String(today.getDate()).padStart(2, '0')}</strong>
          <small>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(today)}</small>
        </div>
      </section>

      {currentView === 'focus' ? (
        <FocusView
          tasks={tasks}
          priorities={priorities}
          onToggleTask={toggleTask}
          onExit={() => setCurrentView('home')}
          timerDuration={timerDuration}
          timeLeft={timeLeft}
          isRunning={isRunning}
          onSetTimer={setTimer}
          onToggleTimer={toggleTimer}
          onSaveFocusTask={(taskData) => {
            const newTask = {
              id: crypto.randomUUID(),
              type: 'tasks',
              ...taskData,
              createdAt: new Date().toISOString(),
              completed: false,
              completedAt: null
            };
            persist([newTask, ...tasks]);
          }}
        />
      ) : currentView === 'recurring' ? (
        <RecurringTasksView
          tasks={tasks}
          projects={projects}
          onUpdateTasks={persist}
          priorities={priorities}
          tags={tags}
        />
      ) : currentView === 'settings' ? (
        <SettingsView
          session={session}
          activeTab={settingsTab}
          setActiveTab={setSettingsTab}
          priorities={priorities}
          rules={rules}
          tasks={tasks}
          tags={tags}
          setTags={setTags}
          savedViews={savedViews}
          setSavedViews={setSavedViews}
          animatedBackground={animatedBackground}
          onToggleAnimatedBackground={toggleAnimatedBackground}
          onShowPrivacyPolicy={() => setShowPrivacyPolicy(true)}
          onBulkUpdateTasks={persist}
          onSavePriority={p => {
            const exists = priorities.find(x => x.id === p.id);
            if (exists) persistPriorities(priorities.map(x => x.id === p.id ? p : x));
            else persistPriorities([...priorities, { ...p, rank: priorities.length + 1 }]);
          }}
          onDeletePriority={id => persistPriorities(priorities.filter(x => x.id !== id))}
          onReorderPriorities={persistPriorities}
          onSaveRule={r => persistRules([...rules, r])}
          onDeleteRule={id => persistRules(rules.filter(x => x.id !== id))}
        />
      ) : currentView === 'projects' ? (
        <ProjectsView
          projects={visibleProjects}
          tasks={tasks}
          session={session}
          activities={activities}
          onUpdateActivities={persistActivities}
          onSaveProject={projectData => {
            const isNew = !projects.some(p => p.id === projectData.id);
            if (isNew) {
              projectData.ownerId = session.email;
              projectData.members = [];
            }
            const nextProjects = isNew
              ? [projectData, ...projects]
              : projects.map(p => p.id === projectData.id ? { ...p, ...projectData } : p);
            persistProjects(nextProjects);
          }}
          onDeleteProject={id => {
            persistProjects(projects.filter(p => p.id !== id));
            persist(tasks.filter(t => t.projectId !== id));
          }}
          onArchiveProject={id => {
            persistProjects(projects.map(p => p.id === id ? { ...p, status: 'archived' } : p));
          }}
          onToggleTask={toggleTask}
          onEditTask={task => {
            setCurrentView('home');
            startEditing(task);
          }}
          onSaveProjectTask={taskData => {
            if (taskData.remindAt) requestNotificationPermission();
            const newTask = {
              id: crypto.randomUUID(),
              type: 'tasks',
              title: taskData.title,
              description: taskData.description || '',
              remindAt: taskData.remindAt || null,
              projectId: taskData.projectId,
              priority: null,
              tags: [],
              createdAt: new Date().toISOString(),
              createdBy: session.email,
              assignedTo: taskData.assignedTo || null,
              completed: false,
              completedAt: null
            };
            if (taskData.recurrence) {
              newTask.recurrence = taskData.recurrence;
            }
            persist([newTask, ...tasks]);
          }}
          overdueTasks={overdueTasks}
        />
      ) : currentView === 'calendar' ? (
        <section className="workspace-calendar">
          <CalendarView
            tasks={tasks}
            onToggleTask={toggleTask}
            onEditTask={(task) => {
              setCurrentView('home');
              switchList('reminders');
              startEditing(task);
            }}
          />
        </section>
      ) : (
        <section className="workspace" aria-label="Task manager">
          <div className="list-switcher" role="tablist" aria-label="Choose list type">
            <button className={listType === 'tasks' ? 'active' : ''} onClick={() => switchList('tasks')} type="button" role="tab" aria-selected={listType === 'tasks'}><span>✓</span><b>To-do list</b><small>Plan your tasks</small></button>
            <button className={listType === 'reminders' ? 'active' : ''} onClick={() => switchList('reminders')} type="button" role="tab" aria-selected={listType === 'reminders'}><span>◷</span><b>Reminder list</b><small>Never miss a thing</small></button>
          </div>
          <div className="mobile-quick-add">
            <div>
              <p>{listType === 'tasks' ? 'Your to-dos' : 'Your reminders'}</p>
              <span>{listType === 'tasks' ? 'Keep your day clear and moving.' : 'Set it once, then let Flowlist remember.'}</span>
            </div>
            <button className="primary-button" type="button" onClick={() => setHomeFormOpen(true)}>
              {listType === 'tasks' ? 'Add task' : 'Add reminder'} <span>+</span>
            </button>
          </div>
          <form className={`add-card home-task-form${homeFormOpen ? ' is-open' : ' is-collapsed'}`} onSubmit={saveTask}>
            <div className="add-card-heading"><div className="icon-circle">{listType === 'tasks' ? '+' : '◷'}</div><div><h2>{editingId ? `Edit ${listType === 'tasks' ? 'task' : 'reminder'}` : `Add a ${listType === 'tasks' ? 'task' : 'reminder'}`}</h2><p>{listType === 'tasks' ? 'What needs your attention?' : 'What would you like to remember?'}</p></div></div>
            <div style={{ position: 'relative' }}>
              <label><span>{listType === 'tasks' ? 'Task title' : 'Reminder title'}</span>
                <input ref={taskTitleInputRef} value={title} onChange={handleTitleChange} maxLength="80" required placeholder={listType === 'tasks' ? 'e.g. Send the project update #urgent' : 'e.g. Call Mum'} autoComplete="off" />
              </label>

              {tagAutocomplete.active && (
                <div className="tag-autocomplete-popover" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px', zIndex: 10, padding: '8px', boxShadow: '0 10px 30px var(--shadow)', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--muted)', fontWeight: 600, position: 'sticky', top: 0, background: 'var(--paper)', paddingBottom: '4px' }}>Select a tag</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(() => {
                      const query = tagAutocomplete.query;
                      let matches = tags.filter(t => fuzzyMatch(query, t.name) || (t.icon && t.icon.includes(query)));
                      let fallback = false;
                      if (matches.length === 0 && query.length > 2) {
                        matches = tags.map(t => ({ tag: t, dist: levenshtein(query, t.name) }))
                          .filter(t => t.dist <= 2)
                          .sort((a, b) => a.dist - b.dist)
                          .map(t => t.tag);
                        if (matches.length > 0) fallback = true;
                      }

                      return (
                        <>
                          {fallback && <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 4px', fontStyle: 'italic' }}>Did you mean?</p>}
                          {matches.map(t => (
                            <button key={t.id} type="button" onClick={() => handleTagAutocompleteSelect(t.name)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', width: '100%' }} className="tab-btn">
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: `color-mix(in srgb, ${t.color || 'var(--line)'} 15%, transparent)`, color: t.color || 'inherit' }}>{t.icon || '🏷️'}</span>
                              <strong style={{ flex: 1, color: t.color || 'inherit' }}>{t.name}</strong>
                            </button>
                          ))}
                          {query && !tags.some(t => t.name === query) && (
                            <button type="button" onClick={() => handleTagAutocompleteSelect(query)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', width: '100%' }} className="tab-btn">
                              <span>🏷️</span>
                              <strong style={{ flex: 1 }}>Create "{query}"</strong>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            {listType === 'reminders' && (
              <>
                <label>
                  <span>Remind me <i>(optional)</i></span>
                  <input type="datetime-local" value={remindAt} onChange={event => setRemindAt(event.target.value)} />
                </label>
                <label>
                  <span>Repeat <i>(optional)</i></span>
                  <select value={recurrenceFrequency} onChange={e => setRecurrenceFrequency(e.target.value)}>
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Every weekday</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom...</option>
                  </select>
                </label>
                {recurrenceFrequency === 'custom' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '-8px', marginBottom: '16px' }}>
                    <label style={{ margin: 0 }}>
                      <span>Every</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="number" min="1" value={recurrenceInterval} onChange={e => setRecurrenceInterval(e.target.value)} style={{ width: '80px' }} />
                        <select value={recurrenceFrequency} onChange={e => setRecurrenceFrequency(e.target.value)} style={{ flex: 1, padding: '11px 12px', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--paper)', outline: 'none' }}>
                          <option value="daily">days</option>
                          <option value="weekly">weeks</option>
                          <option value="monthly">months</option>
                          <option value="yearly">years</option>
                        </select>
                      </div>
                    </label>
                  </div>
                )}
                {(recurrenceFrequency === 'weekly' || (recurrenceFrequency === 'custom' && recurrenceFrequency === 'weekly')) && (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>On these days</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`preset-btn ${recurrenceWeekdays.includes(idx) ? 'active' : ''}`}
                          style={{ padding: '6px 10px', minWidth: '32px' }}
                          onClick={() => {
                            if (recurrenceWeekdays.includes(idx)) setRecurrenceWeekdays(recurrenceWeekdays.filter(d => d !== idx));
                            else setRecurrenceWeekdays([...recurrenceWeekdays, idx]);
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {recurrenceFrequency !== 'none' && (
                  <label>
                    <span>Ends on <i>(optional)</i></span>
                    <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} />
                  </label>
                )}
              </>
            )}
            <label><span>Description <i>(optional)</i></span><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength="300" placeholder="Add a few helpful details..." /></label>

            <button className="text-button advanced-toggle" type="button" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? 'Hide options' : 'More options...'}
            </button>

            {showAdvanced && (
              <div className="advanced-options-grid">
                <label><span>Project</span>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)}>
                    <option value="">No Project</option>
                    {projects.filter(p => p.status !== 'archived').map(p => (
                      <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                </label>
                <label><span>Priority</span>
                  <select value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="">None</option>
                    {[...priorities].sort((a, b) => a.rank - b.rank).map(p => (
                      <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="form-actions">
              <button className="text-button mobile-form-cancel" type="button" onClick={() => { resetForm(); setHomeFormOpen(false); }}>Cancel</button>
              {editingId && <button className="text-button" type="button" onClick={() => { resetForm(); setHomeFormOpen(false); }}>Cancel edit</button>}
              <button className="primary-button" type="submit">{editingId ? 'Save changes' : `Add ${listType === 'tasks' ? 'task' : 'reminder'}`} <span>→</span></button>
            </div>
          </form>

          <section className="task-area" aria-labelledby="tasks-title">
            <div className="task-toolbar"><div><p className="section-kicker">{listType === 'tasks' ? 'TASKS' : 'REMINDERS'}</p><h2 id="tasks-title">{listType === 'tasks' ? 'Your to-dos' : 'Your reminders'} <span>{currentTasks.length}</span></h2></div><div className="filters" role="group" aria-label="Filter tasks">
              <button className={`filter ${bulkSelectMode ? 'active' : ''}`} onClick={() => { setBulkSelectMode(!bulkSelectMode); setSelectedTaskIds(new Set()); }} type="button" style={{ marginRight: '8px' }}>✓ Select</button>
              {[['all', 'All'], ['active', 'Active'], ['completed', 'Done']].map(([value, label]) => <button key={value} className={`filter ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)} type="button">{label}</button>)}
            </div></div>
            <div className="task-list" aria-live="polite">
              {visibleTasks.map(task => <article
                className={`task-card ${task.completed ? 'completed' : ''} ${draggedTaskId === task.id ? 'dragging' : ''}`}
                key={task.id}
                onPointerDown={(e) => handleTaskPointerDown(e, task.id)}
                onPointerEnter={(e) => handleTaskPointerEnter(e, task.id)}
                onPointerUp={handleTaskPointerUp}
                onPointerCancel={handleTaskPointerUp}
                style={{ touchAction: 'none' }}
              >
                {bulkSelectMode ? (
                  <button className="checkbox" style={selectedTaskIds.has(task.id) ? { borderColor: 'var(--purple)', background: 'var(--purple)' } : {}} type="button" onClick={() => {
                    const next = new Set(selectedTaskIds);
                    if (next.has(task.id)) next.delete(task.id);
                    else next.add(task.id);
                    setSelectedTaskIds(next);
                  }} aria-label="Select task">
                    <span style={{ opacity: selectedTaskIds.has(task.id) ? 1 : 0 }}>✓</span>
                  </button>
                ) : (
                  <button className="checkbox" type="button" onClick={() => toggleTask(task.id)} aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}><span>✓</span></button>
                )}
                <div className="task-content">
                  <h3 className="task-title">{task.title}</h3>

                  {/* Advanced task badges */}
                  {(task.priority || task.projectId || (task.tags && task.tags.length > 0)) && (
                    <div className="task-badges">
                      {task.projectId && projects.find(p => p.id === task.projectId) && (() => {
                        const proj = projects.find(p => p.id === task.projectId);
                        return <span className="badge project-badge" style={{ '--badge-color': proj.color || '#9e90ff' }}>{proj.icon} {proj.name}</span>;
                      })()}
                      {task.priority && priorities.find(p => p.id === task.priority) && (() => {
                        const prio = priorities.find(p => p.id === task.priority);
                        return (
                          <span className="badge priority-badge" style={{ '--badge-color': prio.color }}>
                            {prio.icon} {prio.name}
                          </span>
                        );
                      })()}
                      {task.tags && task.tags.map(tagName => {
                        const tagObj = tags.find(t => t.name === tagName);
                        return (
                          <span key={tagName} className="badge tag-badge" style={tagObj ? { '--badge-color': tagObj.color } : {}}>
                            {tagObj?.icon ? `${tagObj.icon} ` : ''}#{tagName}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {task.recurrence && task.recurrence.frequency !== 'none' && (
                    <p className="recurrence-label">
                      ↻ {getRecurrenceLabel(task.recurrence)}
                    </p>
                  )}

                  {task.remindAt && <p className="reminder-time">◷ {formatDate(task.remindAt)}</p>}
                  {/* Overdue indicator */}
                  {overdueTasks.has(task.id) && (
                    <p className="overdue-indicator">
                      <span className="overdue-dot" />
                      Overdue
                    </p>
                  )}
                  {task.description && <p className="task-description">{task.description}</p>}
                  <p className="task-meta">{task.completed ? `Completed ${formatDate(task.completedAt)}` : `Created ${formatDate(task.createdAt)}`}</p>
                </div>
                <div className="task-actions"><button className="icon-button edit-button" type="button" onClick={() => startEditing(task)} aria-label="Edit task">✎</button><button className="icon-button delete-button" type="button" onClick={() => deleteTask(task.id)} aria-label="Delete task">×</button></div>
              </article>)}
            </div>
            {visibleTasks.length === 0 && <div className="empty-state visible"><div className="empty-icon">{listType === 'tasks' ? '✓' : '◷'}</div><h3>{currentTasks.length ? `No matching ${listType === 'tasks' ? 'tasks' : 'reminders'}` : 'Nothing here yet'}</h3><p>{listType === 'tasks' ? 'Add your first task and give your day a little more room to breathe.' : 'Add a reminder and make space in your mind for what matters.'}</p></div>}
          </section>
        </section>
      )}
    </main>

    {bulkSelectMode && selectedTaskIds.size > 0 && (
      <div className="bulk-action-bar">
        <span style={{ fontWeight: 600 }}>{selectedTaskIds.size} task{selectedTaskIds.size !== 1 && 's'} selected</span>
        <button className="primary-button" onClick={() => setBulkTagModalOpen(true)}>Manage Tags</button>
        <button className="text-button" style={{ color: 'var(--danger)' }} onClick={() => {
          persist(tasks.filter(t => !selectedTaskIds.has(t.id)));
          setSelectedTaskIds(new Set());
          setBulkSelectMode(false);
        }}>Delete</button>
      </div>
    )}

    {bulkTagModalOpen && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Bulk Manage Tags</h3>
          <p>Select tags to add to all {selectedTaskIds.size} selected tasks.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
            {tags.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={bulkTagsToAdd.has(t.name)} onChange={(e) => {
                  const next = new Set(bulkTagsToAdd);
                  if (e.target.checked) next.add(t.name);
                  else next.delete(t.name);
                  setBulkTagsToAdd(next);
                }} />
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: `color-mix(in srgb, ${t.color || 'var(--line)'} 15%, transparent)`, color: t.color || 'inherit' }}>{t.icon || '🏷️'}</span>
                {t.name}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="text-button" onClick={() => { setBulkTagModalOpen(false); setBulkTagsToAdd(new Set()); }}>Cancel</button>
            <button className="primary-button" onClick={() => {
              const nextTasks = tasks.map(task => {
                if (selectedTaskIds.has(task.id)) {
                  const tSet = new Set(task.tags || []);
                  bulkTagsToAdd.forEach(tag => tSet.add(tag));
                  return { ...task, tags: Array.from(tSet) };
                }
                return task;
              });
              persist(nextTasks);
              setBulkTagModalOpen(false);
              setBulkSelectMode(false);
              setSelectedTaskIds(new Set());
              setBulkTagsToAdd(new Set());
            }}>Apply Tags</button>
          </div>
        </div>
      </div>
    )}

    {/* Toast notifications */}
    <ToastStack
      toasts={toasts}
      onDismiss={dismissToast}
      onSnooze={snoozeTask}
      onComplete={completeTaskFromToast}
    />

    {isRunning && currentView !== 'focus' && (
      <FloatingTimerWidget
        timeLeft={timeLeft}
        isRunning={isRunning}
        onToggle={toggleTimer}
        onClick={() => setCurrentView('focus')}
      />
    )}
  </>;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[Flowlist] Uncaught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', alignItems: 'center', justifyContent: 'center', color: 'var(--ink, #333)', background: 'var(--cream, #FDFBF7)', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', fontSize: '32px', marginBottom: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #6254e7 0%, #9e90ff 100%)', display: 'grid', placeItems: 'center', color: '#fff' }}>!</div>
          <div style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.03em', marginBottom: '8px' }}>Something went wrong</div>
          <div style={{ fontSize: '13px', color: 'var(--muted, #999)', marginBottom: '20px', maxWidth: '300px', lineHeight: '1.5' }}>
            Flowlist encountered an error. This sometimes happens on devices with limited graphics support.
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg, #6254e7, #9e90ff)', color: '#fff', padding: '11px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            Reload App
          </button>
          <details style={{ marginTop: '20px', fontSize: '11px', color: 'var(--muted, #999)', maxWidth: '300px', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer' }}>Error details</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '8px' }}>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
