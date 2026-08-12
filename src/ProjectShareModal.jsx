import React, { useState } from 'react';
import { ROLES, INVITE_STATUS, getAvatarColor, getAvatarInitials } from './utils/collaboration';

export default function ProjectShareModal({ project, session, onClose, onUpdateProject, onUpdateActivities, activities }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLES.COLLABORATOR);

  const isOwner = project.ownerId === session?.email;

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !isOwner) return;

    const email = inviteEmail.trim().toLowerCase();
    
    if (email === project.ownerId) return; // Cannot invite owner
    if (project.members.some(m => m.email === email)) return; // Already invited

    const newMember = {
      userId: crypto.randomUUID(),
      name: email.split('@')[0], // Simulated name
      email: email,
      avatarColor: getAvatarColor(email),
      role: inviteRole,
      inviteStatus: INVITE_STATUS.PENDING
    };

    const nextProject = {
      ...project,
      isShared: true,
      members: [...project.members, newMember]
    };

    onUpdateProject(nextProject);

    // Log Activity
    const newActivity = {
      id: crypto.randomUUID(),
      projectId: project.id,
      actorId: session?.email,
      type: 'member_invited',
      metadata: { targetEmail: email, role: inviteRole },
      createdAt: new Date().toISOString()
    };
    onUpdateActivities([newActivity, ...activities]);

    setInviteEmail('');
  };

  const handleRemoveMember = (email) => {
    if (!isOwner) return;
    const nextProject = {
      ...project,
      members: project.members.filter(m => m.email !== email)
    };
    if (nextProject.members.length === 0) {
      nextProject.isShared = false;
    }
    onUpdateProject(nextProject);
  };

  const handleChangeRole = (email, newRole) => {
    if (!isOwner) return;
    const nextProject = {
      ...project,
      members: project.members.map(m => m.email === email ? { ...m, role: newRole } : m)
    };
    onUpdateProject(nextProject);
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}>
      <div className="add-card" style={{ width: 'min(440px, 90vw)', position: 'relative', top: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
        <button type="button" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        
        <h2 style={{ fontSize: '20px', margin: '0 0 8px' }}>Share Project</h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 24px' }}>Invite people to collaborate on {project.name}.</p>

        {isOwner && (
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            <input 
              type="email" 
              placeholder="Email address" 
              value={inviteEmail} 
              onChange={e => setInviteEmail(e.target.value)} 
              required
              style={{ flex: 1 }}
            />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ width: '130px' }}>
              <option value={ROLES.COLLABORATOR}>Collaborator</option>
              <option value={ROLES.VIEWER}>Viewer</option>
            </select>
            <button type="submit" className="primary-button" style={{ padding: '8px 16px' }}>Invite</button>
          </form>
        )}

        <div>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '16px' }}>Members</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Owner */}
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: getAvatarColor(project.ownerId), color: '#fff', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                {getAvatarInitials(project.ownerId)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{project.ownerId === session?.email ? 'You' : project.ownerId}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Owner</div>
              </div>
            </li>

            {/* Members */}
            {project.members && project.members.map(member => (
              <li key={member.email} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: member.avatarColor, color: '#fff', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 'bold', opacity: member.inviteStatus === INVITE_STATUS.PENDING ? 0.6 : 1 }}>
                  {getAvatarInitials(member.name || member.email)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{member.email === session?.email ? 'You' : member.email}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {member.inviteStatus === INVITE_STATUS.PENDING ? 'Pending • ' : ''} 
                    {member.inviteStatus === INVITE_STATUS.DECLINED ? 'Declined • ' : ''} 
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </div>
                </div>
                {isOwner && member.email !== session?.email && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      value={member.role} 
                      onChange={(e) => handleChangeRole(member.email, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--line)' }}
                    >
                      <option value={ROLES.COLLABORATOR}>Collaborator</option>
                      <option value={ROLES.VIEWER}>Viewer</option>
                    </select>
                    <button type="button" onClick={() => handleRemoveMember(member.email)} style={{ background: 'transparent', border: 'none', color: '#d95d66', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                      Remove
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
