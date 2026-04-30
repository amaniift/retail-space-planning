import React from 'react'
import { useStore } from '../store'

export default function WorkflowPanel() {
  const users = useStore(state => state.users)
  const currentUser = useStore(state => state.currentUser)
  const setCurrentUser = useStore(state => state.setCurrentUser)
  const workflow = useStore(state => state.workflow)
  const updateWorkflow = useStore(state => state.updateWorkflow)

  const [isMinimized, setIsMinimized] = React.useState(false)

  if (!currentUser || !workflow) return null

  const statusColors = {
    'Draft': '#aaaaaa',
    'Review': '#3b82f6',
    'Approved': '#eab308',
    'Published': '#22c55e'
  }

  const canEdit = currentUser.role !== 'viewer'

  return (
    <div className="workflow-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMinimized ? 0 : 12 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Workflow Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={currentUser.id}
            onChange={(e) => setCurrentUser(e.target.value)}
            style={{
              padding: '4px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.3)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.role})
              </option>
            ))}
          </select>
          <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
            {isMinimized ? '+' : '−'}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            background: `rgba(255, 255, 255, 0.05)`,
            color: statusColors[workflow.status] || '#aaa',
            border: `1px solid ${statusColors[workflow.status] || '#aaa'}`
          }}>
          {workflow.status}
        </span>

        <select
          value={workflow.status}
          onChange={(e) => updateWorkflow(e.target.value)}
          disabled={!canEdit}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '4px',
            background: canEdit ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
            color: canEdit ? 'white' : '#888',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <option value="Draft">Draft</option>
          <option value="Review">Review</option>
          <option value="Approved">Approved</option>
          <option value="Published">Published</option>
        </select>
      </div>
      {!canEdit && (
        <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#ff9d9d' }}>
          * Viewers cannot change workflow status
        </div>
      )}
      </div>
      )}
    </div>
  )
}