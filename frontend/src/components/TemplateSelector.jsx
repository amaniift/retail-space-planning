import React, { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, RoundedBox } from '@react-three/drei'
import { useStore } from '../store'

const FIXTURE_TEMPLATES = [
    { id: 'standard-gondola', name: 'Standard Gondola', type: 'Gondola', width: 1200, height: 2000, depth: 500, base_height: 200, shelves: 4, description: 'Double-sided island shelving unit.' },
    { id: 'endcap', name: 'Endcap Display', type: 'Endcap', width: 900, height: 1800, depth: 450, base_height: 150, shelves: 3, description: 'Promotional display at the end of an aisle.' },
    { id: 'slim-wall', name: 'Slim Wall Unit', type: 'Wall', width: 600, height: 2200, depth: 300, base_height: 100, shelves: 6, description: 'Tall, narrow wall shelving for small items.' },
    { id: 'wide-bay', name: 'Wide Stock Bay', type: 'Gondola', width: 1800, height: 2100, depth: 600, base_height: 250, shelves: 5, description: 'Heavy-duty wide shelving for bulk items.' },
    { id: 'beverage-cooler', name: 'Beverage Cooler', type: 'Cooler', width: 1500, height: 2200, depth: 700, base_height: 200, shelves: 5, description: 'Large reach-in refrigerator unit.' },
    { id: 'checkout-impulse', name: 'Impulse Rack', type: 'Impulse', width: 400, height: 1200, depth: 250, base_height: 50, shelves: 4, description: 'Small counter-top or aisle impulse unit.' },
    { id: 'produce-bin', name: 'Produce Bin', type: 'Bin', width: 1200, height: 900, depth: 1000, base_height: 400, shelves: 2, description: 'Deep bin for loose bulk products.' },
    { id: 'bakery-shelf', name: 'Bakery Rack', type: 'Rack', width: 1000, height: 1700, depth: 400, base_height: 200, shelves: 4, description: 'Open wire shelving for bread and pastries.' },
    { id: 'pharmacy-bay', name: 'Pharmacy Bay', type: 'Gondola', width: 2000, height: 2400, depth: 400, base_height: 150, shelves: 7, description: 'Dense shelving for medication and health products.' },
    { id: 'promo-table', name: 'Promo Table', type: 'Table', width: 1500, height: 900, depth: 1500, base_height: 800, shelves: 1, description: 'Single level promotional display table.' },
]

function TemplatePreview({ template }) {
    const shelfSpacing = 400
    return (
        <group>
            {/* Back panel */}
            <mesh position={[0, template.height / 2, -template.depth / 2]}>
                <boxGeometry args={[template.width, template.height, 10]} />
                <meshStandardMaterial color="#666" />
            </mesh>
            {/* Shelves */}
            {Array.from({ length: template.shelves }).map((_, i) => (
                <mesh key={i} position={[0, template.base_height + i * shelfSpacing, 0]}>
                    <boxGeometry args={[template.width, 20, template.depth]} />
                    <meshStandardMaterial color="#aaa" />
                </mesh>
            ))}
            <gridHelper args={[2000, 20]} rotation={[0, 0, 0]} position={[0, -1, 0]} />
        </group>
    )
}

export default function TemplateSelector({ onClose, storeId }) {
    const [selected, setSelected] = useState(FIXTURE_TEMPLATES[0])
    const createFixture = useStore(state => state.createFixture)
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!storeId) return
        setLoading(true)
        try {
            await createFixture({
                store_id: storeId,
                name: `${selected.name} ${Date.now().toString().slice(-4)}`,
                type: selected.type,
                width: selected.width,
                height: selected.height,
                depth: selected.depth,
                base_height: selected.base_height,
                number_of_shelves: selected.shelves
            })
            onClose()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="template-selector-overlay">
            <div className="template-selector-modal">
                <div className="template-selector-header">
                    <h2>Create Fixture from Template</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <div className="template-selector-content">
                    <div className="template-list">
                        {FIXTURE_TEMPLATES.map(t => (
                            <div
                                key={t.id}
                                className={`template-item ${selected.id === t.id ? 'active' : ''}`}
                                onClick={() => setSelected(t)}
                            >
                                <strong>{t.name}</strong>
                                <span>{t.type} • {t.shelves} Shelves</span>
                            </div>
                        ))}
                    </div>

                    <div className="template-preview">
                        <div className="preview-canvas-container">
                            <Canvas shadows camera={{ position: [2000, 2000, 2000], fov: 45 }}>
                                <Suspense fallback={null}>
                                    <Stage environment="city" intensity={0.5} contactShadow={false}>
                                        <TemplatePreview template={selected} />
                                    </Stage>
                                </Suspense>
                                <OrbitControls autoRotate autoRotateSpeed={0.5} />
                            </Canvas>
                        </div>

                        <div className="template-details">
                            <h3>{selected.name}</h3>
                            <p>{selected.description}</p>
                            <div className="template-dims">
                                <div><span>Width:</span> {selected.width}mm</div>
                                <div><span>Height:</span> {selected.height}mm</div>
                                <div><span>Depth:</span> {selected.depth}mm</div>
                                <div><span>Shelves:</span> {selected.shelves}</div>
                            </div>

                            <button
                                className="primary-btn"
                                onClick={handleCreate}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Use This Template'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}