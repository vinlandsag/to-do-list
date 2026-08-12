/**
 * Flowlist Collaboration Utilities
 * 
 * Simulated local-first collaboration for Projects.
 */

export const ROLES = {
  OWNER: 'owner',
  COLLABORATOR: 'collaborator',
  VIEWER: 'viewer'
};

export const INVITE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined'
};

/**
 * Get the user's role in a given project.
 */
export function getUserRole(project, userEmail) {
  if (!project || !userEmail) return null;
  if (project.ownerId === userEmail) return ROLES.OWNER;
  
  if (project.members) {
    const member = project.members.find(m => m.email === userEmail);
    if (member && member.inviteStatus === INVITE_STATUS.ACCEPTED) {
      return member.role;
    }
  }
  return null;
}

export function canManageProject(project, userEmail) {
  return getUserRole(project, userEmail) === ROLES.OWNER;
}

export function canEditTasks(project, userEmail) {
  const role = getUserRole(project, userEmail);
  return role === ROLES.OWNER || role === ROLES.COLLABORATOR;
}

export function isViewer(project, userEmail) {
  return getUserRole(project, userEmail) === ROLES.VIEWER;
}

/**
 * Generate a consistent background color based on an email address.
 */
export function getAvatarColor(email) {
  if (!email) return '#9e90ff';
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 45%)`;
}

/**
 * Get simple initials from a name or email.
 */
export function getAvatarInitials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.trim().split(/[\s.@]+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

/**
 * Perform a one-time migration of local data to assign ownership to the current user.
 */
export function migrateToCollaborationModel(projects, tasks, sessionEmail) {
  let projectsChanged = false;
  let tasksChanged = false;

  const nextProjects = projects.map(p => {
    if (!p.ownerId) {
      projectsChanged = true;
      return {
        ...p,
        ownerId: sessionEmail,
        isShared: false,
        members: []
      };
    }
    // Ensure all projects have members array
    if (!p.members) {
      projectsChanged = true;
      return { ...p, members: [] };
    }
    return p;
  });

  const nextTasks = tasks.map(t => {
    if (!t.createdBy) {
      tasksChanged = true;
      return {
        ...t,
        createdBy: sessionEmail,
        assignedTo: null,
        completedBy: t.completed ? sessionEmail : null
      };
    }
    return t;
  });

  return { 
    projectsChanged, nextProjects, 
    tasksChanged, nextTasks 
  };
}
