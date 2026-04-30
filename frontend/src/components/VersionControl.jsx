import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import axios from 'axios'

export default function VersionControl() {
    const fixtureData = useStore((s) => s.fixtureData)
    const fetchFixtureData = useStore((s) => s.fetchFixtureData)
    const pushUndoSnapshot = useStore((s) => s.pushUndoSnapshot)
    const undo = useStore((s) => s.undo)
    const redo = useStore((s) => s.redo)
    const [versions, setVersions] = useState([])
    const [name, setName] = useState('')
    const [isMinimized, setIsMinimized] = useState(false)

    useEffect(() => {
        const raw = localStorage.getItem('planogram_versions')
        setVersions(raw ? JSON.parse(raw) : [])
    }, [])

    const saveVersion = () => {
        if (!fixtureData) return
        const v = { id: Date.now(), name: name || `Version ${new Date().toLocaleString()}`, fixtureId: fixtureData.id, snapshot: fixtureData }
        const next = [v, ...versions]
        localStorage.setItem('planogram_versions', JSON.stringify(next))
        setVersions(next)
        setName('')
    }

    const revertVersion = async (v) => {
        if (!v || !v.snapshot) return
        // naive revert: delete all current positions and re-create from snapshot
        try {
            const current = await axios.get(`http://localhost:8000/api/planogram/${v.fixtureId}`)
            // delete existing positions
            for (const shelf of current.data.shelves) {
                for (const pos of shelf.positions) {
                    try { await axios.delete(`http://localhost:8000/api/planogram/position/${pos.id}`) } catch (e) { }
                }
            }

            // create positions from snapshot
            for (const shelf of v.snapshot.shelves) {
                for (const pos of shelf.positions) {
                    const body = {
                        product_id: pos.product.id,
                        shelf_id: shelf.id,
                        pos_x: pos.pos_x,
                        pos_y: pos.pos_y,
                        facings_wide: pos.facings_wide
                    }
                    try { await axios.post('http://localhost:8000/api/planogram/position/add', body) } catch (e) { console.error(e) }
                }
            }

            // refresh
            fetchFixtureData(v.fixtureId)
        } catch (err) {
            console.error(err)
        }
    }

    const removeVersion = (id) => {
        const next = versions.filter((v) => v.id !== id)
        localStorage.setItem('planogram_versions', JSON.stringify(next))
        setVersions(next)
    }

    const removeAllPositions = async () => {
        if (!fixtureData) return
        pushUndoSnapshot()
        try {
            const current = await axios.get(`http://localhost:8000/api/planogram/${fixtureData.id}`)
            for (const shelf of current.data.shelves) {
                for (const pos of shelf.positions) {
                    try { await axios.delete(`http://localhost:8000/api/planogram/position/${pos.id}`) } catch (e) { }
                }
            }
            fetchFixtureData(fixtureData.id)
        } catch (err) { console.error(err) }
    }

    return (
        <div className="version-control">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMinimized ? 0 : 8 }}>
                <h3 style={{ margin: 0 }}>Planogram Versions</h3>
                <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                    {isMinimized ? '+' : '−'}
                </button>
            </div>
            {!isMinimized && (
            <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button onClick={() => undo()} className="secondary-btn">Undo</button>
                <button onClick={() => redo()} className="secondary-btn">Redo</button>
                <button onClick={removeAllPositions} className="cancel-btn">Remove All</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Version name (optional)" />
                <button onClick={saveVersion} className="primary-btn">Save Version</button>
            </div>

            <div style={{ marginTop: 12, maxHeight: 220, overflow: 'auto' }}>
                {versions.length === 0 && <div style={{ color: '#888' }}>No saved versions</div>}
                {versions.map((v) => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{v.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#999' }}>{new Date(v.id).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => revertVersion(v)} className="secondary-btn">Revert</button>
                            <button onClick={() => removeVersion(v.id)} className="cancel-btn">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
            </>
            )}
            </div>
        </div>
    )
}
