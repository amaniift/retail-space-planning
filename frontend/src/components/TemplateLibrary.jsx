import React from 'react'
import axios from 'axios'
import { useStore } from '../store'

const TEMPLATES = [
    {
        id: 'endcap-3-shelf',
        name: 'Endcap - 3 Shelves, 3 products each',
        positions: [
            // structure: shelfIndex, pos_x, productIndexPlaceholder
            { shelfIndex: 0, pos_x: 100 }, { shelfIndex: 0, pos_x: 300 }, { shelfIndex: 0, pos_x: 500 },
            { shelfIndex: 1, pos_x: 100 }, { shelfIndex: 1, pos_x: 300 }, { shelfIndex: 1, pos_x: 500 },
            { shelfIndex: 2, pos_x: 100 }, { shelfIndex: 2, pos_x: 300 }, { shelfIndex: 2, pos_x: 500 }
        ]
    },
    {
        id: 'linear-4-wide',
        name: 'Linear - 4 wide evenly spaced',
        positions: [
            { shelfIndex: 0, pos_x: 100 }, { shelfIndex: 0, pos_x: 300 }, { shelfIndex: 0, pos_x: 500 }, { shelfIndex: 0, pos_x: 700 }
        ]
    }
]

export default function TemplateLibrary() {
    const fixtureData = useStore((s) => s.fixtureData)
    const products = useStore((s) => s.products)
    const fetchFixtureData = useStore((s) => s.fetchFixtureData)
    const pushUndoSnapshot = useStore((s) => s.pushUndoSnapshot)
    const [isMinimized, setIsMinimized] = React.useState(false)
    const [isMinimized, setIsMinimized] = React.useState(false)

    const applyTemplate = async (template) => {
        if (!fixtureData) return
        pushUndoSnapshot()
        // choose products for placeholders (first N products)
        const available = products.slice(0) // copy
        let pi = 0

        for (const tplPos of template.positions) {
            const product = available[pi % available.length]
            pi++
            const shelf = fixtureData.shelves[tplPos.shelfIndex]
            if (!shelf) continue

            const body = {
                product_id: product.id,
                shelf_id: shelf.id,
                pos_x: tplPos.pos_x,
                pos_y: shelf.vertical_position_y,
                facings_wide: 1
            }

            try {
                await axios.post('http://localhost:8000/api/planogram/position/add', body)
            } catch (err) {
                console.error('Failed to add position', err)
            }
        }

        // refresh
        fetchFixtureData(fixtureData.id)
    }

    return (
        <div className="template-library">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMinimized ? 0 : 8 }}>
                <h3 style={{ margin: 0 }}>Fixture Templates</h3>
                <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                    {isMinimized ? '+' : '−'}
                </button>
            </div>
            {!isMinimized && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TEMPLATES.map((t) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#999' }}>{t.positions.length} placements</div>
                        </div>
                        <div>
                            <button onClick={() => applyTemplate(t)} className="primary-btn">Apply</button>
                        </div>
                    </div>
                ))}
            </div>
            )}
        </div>
    )
}
