import React from 'react'
import ProductMesh from './ProductMesh'
import { useStore } from '../store'
import { RoundedBox } from '@react-three/drei'
import axios from 'axios'
import axios from 'axios'

export default function Fixture({ data }) {
  const pendingPlacementProduct = useStore((state) => state.pendingPlacementProduct)
  const setPendingPlacementProduct = useStore((state) => state.setPendingPlacementProduct)
  const fetchFixtureData = useStore((state) => state.fetchFixtureData)
  const previewRecommendations = useStore((state) => state.previewRecommendations)
  const products = useStore((state) => state.products)

  const xOffset = -data.width / 2

  const handleShelfClick = async (e, shelf) => {
    e.stopPropagation()
    if (!pendingPlacementProduct) return

    const clickX = e.point.x - xOffset

    try {
      // save snapshot for undo
      useStore.getState().pushUndoSnapshot()
      await axios.post('http://localhost:8000/api/planogram/position/add', {
        product_id: pendingPlacementProduct.id,
        shelf_id: shelf.id,
        pos_x: clickX,
        pos_y: shelf.vertical_position_y
      })
      setPendingPlacementProduct(null)
      fetchFixtureData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <group position={[xOffset, 0, 0]}>
      {/* Floor / Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[data.width / 2, 0, 0]}>
        <planeGeometry args={[data.width * 2, data.depth * 10]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      <mesh position={[data.width / 2, data.height / 2, -data.depth / 2]}>
        <boxGeometry args={[data.width, data.height, 10]} />
        <meshStandardMaterial color="#888" />
      </mesh>

      {data.shelves.map((shelf) => (
        <group key={shelf.id}>
          <mesh
            position={[shelf.width / 2, shelf.vertical_position_y, 0]}
            onClick={(e) => handleShelfClick(e, shelf)}
            onPointerOver={(e) => { if (pendingPlacementProduct) document.body.style.cursor = 'crosshair' }}
            onPointerOut={(e) => { if (pendingPlacementProduct) document.body.style.cursor = 'default' }}
          >
            <boxGeometry args={[shelf.width, 20, shelf.depth]} />
            <meshStandardMaterial color="#aaa" />
          </mesh>

          {shelf.positions.map((pos) => (
            <ProductMesh key={pos.id} positionData={pos} shelfY={shelf.vertical_position_y} allPositions={shelf.positions} />
          ))}

          {/* Render preview recommendations that target this shelf */}
          {previewRecommendations && previewRecommendations.length > 0 && previewRecommendations.filter(r => r.shelf_id === shelf.id).map((r, idx) => {
            const prod = products.find(p => p.id === r.product_id) || { width: 100, height: 200, depth: 100, color_hex: '#888' }
            const w = prod.width * r.facings_wide
            const h = prod.height * r.facings_high
            const d = prod.depth * r.facings_deep
            const calcY = shelf.vertical_position_y + (h / 2)
            return (
              <group key={`rec-${r.product_id}-${idx}`} position={[r.pos_x, calcY, 0]}>
                <RoundedBox args={[w, h, d]} radius={Math.min(w, h, d) * 0.08} smoothness={3}>
                  <meshStandardMaterial color={prod.color_hex} transparent opacity={0.42} />
                </RoundedBox>
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}
