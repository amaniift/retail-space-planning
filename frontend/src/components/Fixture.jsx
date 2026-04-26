import React from 'react'
import ProductMesh from './ProductMesh'

export default function Fixture({ data }) {
  const xOffset = -data.width / 2
  
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
          <mesh position={[shelf.width / 2, shelf.vertical_position_y, 0]}>
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
