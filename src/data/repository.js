import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const KEYS = {
  SESSION: 'flowlist-session-v1',
  TASKS: 'flowlist-tasks-v1',
  PROJECTS: 'flowlist-projects-v1',
  PRIORITIES: 'flowlist-priorities-v1',
  RULES: 'flowlist-rules-v1',
  TAGS: 'flowlist-tags-v1',
  SAVED_VIEWS: 'flowlist-saved-views-v1',
  ACTIVITIES: 'flowlist-activities-v1',
  ANIMATED_BG: 'flowlist-animated-bg',
  THEME: 'theme',
  NOTIFIED: 'flowlist-notified-v1',
  NOTIFICATION_LOG: 'flowlist-notification-log-v1'
};

const defaultPriorities = [
  { id: 'high', name: 'High', icon: '🔴', color: '#ffcdd2', rank: 1 },
  { id: 'medium', name: 'Medium', icon: '🟡', color: '#ffecb3', rank: 2 },
  { id: 'low', name: 'Low', icon: '🔵', color: '#bbdefb', rank: 3 }
];

function safeRead(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[Flowlist Data Layer] Data corruption detected for key "${key}". Resetting to fallback.`, e);
    try {
      const corruptedData = localStorage.getItem(key);
      if (corruptedData) localStorage.setItem(`${key}-corrupted-backup-${Date.now()}`, corruptedData);
    } catch (backupError) {
      console.error('Failed to backup corrupted data.', backupError);
    }
    return fallback;
  }
}

function safeWrite(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[Flowlist Data Layer] Failed to write data for key "${key}".`, e);
  }
}

function safeReadString(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(key) || fallback;
}

function safeWriteString(key, data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, data);
}

// ─── Sync Helpers ───

async function migrateLocalData(session) {
  if (typeof window === 'undefined' || !supabase) return;
  if (localStorage.getItem('supabase_migrated') === 'true') return;
  if (localStorage.getItem('is_guest_data') === 'true') return;

  const tasks = safeRead(KEYS.TASKS, []);
  const projects = safeRead(KEYS.PROJECTS, []);
  const priorities = safeRead(KEYS.PRIORITIES, defaultPriorities);
  const rules = safeRead(KEYS.RULES, []);
  const activities = safeRead(KEYS.ACTIVITIES, []);
  
  if (tasks.length) await supabase.from('tasks').upsert(tasks.map(t => ({ id: String(t.id), user_id: session.user.id, data: t })));
  if (projects.length) await supabase.from('projects').upsert(projects.map(p => ({ id: String(p.id), user_id: session.user.id, data: p })));
  if (priorities.length) await supabase.from('priorities').upsert(priorities.map(p => ({ id: String(p.id), user_id: session.user.id, data: p })));
  if (rules.length) await supabase.from('rules').upsert(rules.map(r => ({ id: String(r.id), user_id: session.user.id, data: r })));
  if (activities.length) await supabase.from('activities').upsert(activities.map(a => ({ id: String(a.id), user_id: session.user.id, data: a })));
  
  await syncUserSettings(session);
  localStorage.setItem('supabase_migrated', 'true');
}

async function syncUserSettings(session) {
  if (!supabase || !session) return;
  await supabase.from('user_settings').upsert({
    user_id: session.user.id,
    tags: safeRead(KEYS.TAGS, []),
    saved_views: safeRead(KEYS.SAVED_VIEWS, []),
    animated_bg: safeReadString(KEYS.ANIMATED_BG) === 'true',
    theme: safeReadString(KEYS.THEME, 'light')
  });
}

// Helper to fully sync a list to Supabase (upsert all, then delete missing)
async function syncCollection(table, items, session) {
  if (!supabase || !session) return;
  const payload = items.map(item => {
    const row = { id: String(item.id), user_id: session.user.id, data: item };
    if (table === 'tasks') row.project_id = item.projectId || null;
    return row;
  });
  if (payload.length > 0) {
    await supabase.from(table).upsert(payload);
    const ids = items.map(i => String(i.id));
    await supabase.from(table).delete().not('id', 'in', `(${ids.join(',')})`);
  } else {
    // If local is empty, wipe remote for this user
    await supabase.from(table).delete().neq('id', '0');
  }
}

// ─── API Repository ───

let realtimeChannel = null;

export const repository = {
  // Auth & Session
  async getUsers() {
    // Obsolete with Supabase Auth, but keep for legacy UI compatibility if needed temporarily
    return {};
  },
  async saveUsers(users) {
    // Obsolete
  },
  
  async getSession() { 
    if (typeof window !== 'undefined') {
      const stored = safeReadString(KEYS.SESSION);
      const localSession = stored ? JSON.parse(stored) : null;
      if (localSession?.isGuest) return localSession;
    }

    if (!supabase) {
      // Fallback to purely local if no Supabase credentials
      const stored = safeReadString(KEYS.SESSION);
      return stored ? JSON.parse(stored) : null;
    }
    
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session) return null;
    
    await migrateLocalData(session);
    
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.name || session.user.email.split('@')[0]
    };
  },
  
  async setSession(sessionData, remember = false) {
    // With Supabase, session is managed by supabase-js. We just keep this for local-only fallback.
    if (!supabase && typeof window !== 'undefined') {
      const data = JSON.stringify(sessionData);
      if (remember) localStorage.setItem(KEYS.SESSION, data);
      else sessionStorage.setItem(KEYS.SESSION, data);
    }
  },
  
  async clearSession() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(KEYS.SESSION);
      sessionStorage.removeItem(KEYS.SESSION);
      localStorage.removeItem('supabase_migrated');
    }
    this.unsubscribeFromChanges();
  },

  async createGuestSession() {
    const guestSession = { id: 'guest', isGuest: true, name: 'Guest' };
    if (typeof window !== 'undefined') {
      localStorage.setItem('is_guest_data', 'true');
      this.setSession(guestSession, true);
    }
    return guestSession;
  },

  async clearGuestData() {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.reload();
    }
  },

  // Collections (Tasks, Projects, Priorities, Rules, Activities)
  async getTasks() {
    const local = safeRead(KEYS.TASKS, []);
    if (!supabase) return local;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return local;
      
      const { data, error } = await supabase.from('tasks').select('*');
      if (!error && data) {
        const remote = data.map(d => {
           const t = d.data;
           if (d.project_id) t.projectId = d.project_id;
           return t;
        });
        safeWrite(KEYS.TASKS, remote);
        return remote;
      }
    } catch (e) {}
    return local;
  },
  async saveTasks(tasks) {
    safeWrite(KEYS.TASKS, tasks);
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) syncCollection('tasks', tasks, session).then();
    }
  },

  async getProjects() {
    const local = safeRead(KEYS.PROJECTS, []);
    if (!supabase) return local;
    try {
      const { data, error } = await supabase.from('projects').select('*');
      if (!error && data) {
        const remote = data.map(d => d.data);
        safeWrite(KEYS.PROJECTS, remote);
        return remote;
      }
    } catch (e) {}
    return local;
  },
  async saveProjects(projects) {
    safeWrite(KEYS.PROJECTS, projects);
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) syncCollection('projects', projects, session).then();
    }
  },

  async getPriorities() {
    const local = safeRead(KEYS.PRIORITIES, defaultPriorities);
    if (!supabase) return local;
    try {
      const { data, error } = await supabase.from('priorities').select('*');
      if (!error && data && data.length > 0) {
        const remote = data.map(d => d.data);
        safeWrite(KEYS.PRIORITIES, remote);
        return remote;
      }
    } catch (e) {}
    return local;
  },
  async savePriorities(priorities) {
    safeWrite(KEYS.PRIORITIES, priorities);
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) syncCollection('priorities', priorities, session).then();
    }
  },

  async getRules() {
    const local = safeRead(KEYS.RULES, []);
    if (!supabase) return local;
    try {
      const { data, error } = await supabase.from('rules').select('*');
      if (!error && data) {
        const remote = data.map(d => d.data);
        safeWrite(KEYS.RULES, remote);
        return remote;
      }
    } catch (e) {}
    return local;
  },
  async saveRules(rules) {
    safeWrite(KEYS.RULES, rules);
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) syncCollection('rules', rules, session).then();
    }
  },

  async getActivities() {
    const local = safeRead(KEYS.ACTIVITIES, []);
    if (!supabase) return local;
    try {
      const { data, error } = await supabase.from('activities').select('*');
      if (!error && data) {
        const remote = data.map(d => d.data);
        safeWrite(KEYS.ACTIVITIES, remote);
        return remote;
      }
    } catch (e) {}
    return local;
  },
  async saveActivities(activities) {
    safeWrite(KEYS.ACTIVITIES, activities);
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) syncCollection('activities', activities, session).then();
    }
  },

  // Settings & Singletons (Tags, Views, Theme, Bg)
  async _getUserSettings() {
    if (!supabase) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', session.user.id).single();
      if (!error && data) return data;
    } catch (e) {}
    return null;
  },

  async getTags() {
    const local = safeRead(KEYS.TAGS, []);
    if (!supabase) return local;
    const settings = await this._getUserSettings();
    if (settings && settings.tags) {
      safeWrite(KEYS.TAGS, settings.tags);
      return settings.tags;
    }
    return local;
  },
  async saveTags(tags) {
    safeWrite(KEYS.TAGS, tags);
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) syncUserSettings(session).then();
    }
  },

  async getSavedViews() {
    const local = safeRead(KEYS.SAVED_VIEWS, []);
    if (!supabase) return local;
    const settings = await this._getUserSettings();
    if (settings && settings.saved_views) {
      safeWrite(KEYS.SAVED_VIEWS, settings.saved_views);
      return settings.saved_views;
    }
    return local;
  },
  async saveSavedViews(views) {
    safeWrite(KEYS.SAVED_VIEWS, views);
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) syncUserSettings(session).then();
    }
  },

  async getAnimatedBg() { 
    const local = safeReadString(KEYS.ANIMATED_BG);
    if (!supabase) return local === 'true';
    const settings = await this._getUserSettings();
    if (settings && settings.animated_bg !== undefined) {
      safeWriteString(KEYS.ANIMATED_BG, String(settings.animated_bg));
      return settings.animated_bg;
    }
    return local === 'true';
  },
  async saveAnimatedBg(val) { 
    safeWriteString(KEYS.ANIMATED_BG, String(val)); 
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) syncUserSettings(session).then();
    }
  },
  
  async getTheme() { 
    const local = safeReadString(KEYS.THEME, 'light'); 
    if (!supabase) return local;
    const settings = await this._getUserSettings();
    if (settings && settings.theme) {
      safeWriteString(KEYS.THEME, settings.theme);
      return settings.theme;
    }
    return local;
  },
  async saveTheme(theme) { 
    safeWriteString(KEYS.THEME, theme); 
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) syncUserSettings(session).then();
    }
  },

  // Notifications (Local only for now, can be synced if desired, but logs are usually device-specific)
  async getNotified() { return new Set(safeRead(KEYS.NOTIFIED, [])); },
  async saveNotified(notifiedSet) { safeWrite(KEYS.NOTIFIED, Array.from(notifiedSet)); },
  async getNotificationLog() { return safeRead(KEYS.NOTIFICATION_LOG, []); },
  async saveNotificationLog(log) { safeWrite(KEYS.NOTIFICATION_LOG, log); },

  // Data Portability
  
  // Realtime & Sharing
  subscribeToChanges(callback) {
    if (!supabase) return;
    if (realtimeChannel) return;
    realtimeChannel = supabase.channel('flowlist-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
         callback('tasks', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, payload => {
         callback('projects', payload);
      })
      .subscribe();
  },

  unsubscribeFromChanges() {
    if (realtimeChannel && supabase) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },

  async shareProject(projectId, email) {
    if (!supabase) throw new Error('Not connected to cloud.');
    const { data, error } = await supabase.rpc('share_project_by_email', { p_email: email, p_project_id: projectId });
    if (error) throw error;
  },

  async getProjectMembers(projectId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id, profiles(email, name)')
      .eq('project_id', projectId);
    if (error) return [];
    return data.map(d => ({
      userId: d.user_id,
      email: d.profiles?.email,
      name: d.profiles?.name
    }));
  },

  async exportData() {
    const data = {
      tasks: await this.getTasks(),
      projects: await this.getProjects(),
      priorities: await this.getPriorities(),
      rules: await this.getRules(),
      tags: await this.getTags(),
      savedViews: await this.getSavedViews()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowlist-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async deleteAccount() {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const uid = session.user.id;
        await supabase.from('tasks').delete().eq('user_id', uid);
        await supabase.from('projects').delete().eq('user_id', uid);
        await supabase.from('priorities').delete().eq('user_id', uid);
        await supabase.from('rules').delete().eq('user_id', uid);
        await supabase.from('activities').delete().eq('user_id', uid);
        await supabase.from('user_settings').delete().eq('user_id', uid);
      }
    }
    await this.clearSession();
    localStorage.clear();
    window.location.reload();
  }
};
