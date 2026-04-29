import React from 'react'
import ProductMesh from './ProductMesh'
import { useStore } from '../store'
import axios from 'axios'

export default function Fixture({ data }) {
  const pendingPlacementProduct = useStore((state) => state.pendingPlacementProduct)
  const setPendingPlacementProduct = useStore((state) => state.setPendingPlacementProduct)
  const fetchFixtureData = useStore((state) => state.fetchFixtureData)

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
        <meshStandardMaterial color="#222" />
      </mesh>

      <mesh position={[data.width / 2, data.height / 2, -data.depth / 2]}>
        <boxGeometry args={[data.width, data.height, 10]} />
        <meshStandardMaterial color="#444" />
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
            <meshStandardMaterial color="#666" />
          </mesh>

          {shelf.positions.map((pos) => (
            <ProductMesh key={pos.id} positionData={pos} shelfY={shelf.vertical_position_y} allPositions={shelf.positions} />
          ))}
        </group>
      ))}
    </group>
  )
}
