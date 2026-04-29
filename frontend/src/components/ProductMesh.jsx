import React, { useRef } from 'react'
import { Edges, PivotControls } from '@react-three/drei'
import { useStore } from '../store'
import axios from 'axios'
import * as THREE from 'three'

export default function ProductMesh({ positionData, shelfY, allPositions }) {
  const meshRef = useRef()
  const previousMatrix = useRef(new THREE.Matrix4())
  const setSelectedProduct = useStore((state) => state.setSelectedProduct)
  
  const product = positionData.product
  
  const w = product.width * positionData.facings_wide
  const h = product.height * positionData.facings_high
  const d = product.depth * positionData.facings_deep

  const capacity = positionData.facings_wide * positionData.facings_high * positionData.facings_deep
  const dailyMov = product.performance ? product.performance.daily_unit_movement : 0.1
  const dos = dailyMov > 0 ? (capacity / dailyMov) : 0

  const handleClick = (e) => {
    e.stopPropagation()
    setSelectedProduct(product, positionData, dos)
  }

  const calcY = shelfY + (h / 2)

  const onDragStart = () => {
    if (meshRef.current) {
      previousMatrix.current.copy(meshRef.current.matrix)
    }
  }

  const onDrag = () => {
    if (!meshRef.current) return
    meshRef.current.updateMatrixWorld()
    const currentBox = new THREE.Box3().setFromObject(meshRef.current)
    
    let collision = false
    for (const other of allPositions) {
      if (other.id === positionData.id) continue
      const otherW = other.product.width * other.facings_wide
      const otherH = other.product.height * other.facings_high
      const otherD = other.product.depth * other.facings_deep
      const otherY = shelfY + (otherH / 2)
      
      const otherMin = new THREE.Vector3(other.pos_x - otherW/2, otherY - otherH/2, -otherD/2)
      const otherMax = new THREE.Vector3(other.pos_x + otherW/2, otherY + otherH/2, otherD/2)
      const otherBox = new THREE.Box3(otherMin, otherMax)
      
      if (currentBox.intersectsBox(otherBox)) {
        collision = true
        break
      }
    }
    
    if (collision) {
      meshRef.current.matrix.copy(previousMatrix.current)
      meshRef.current.matrix.decompose(meshRef.current.position, meshRef.current.quaternion, meshRef.current.scale)
      meshRef.current.updateMatrixWorld()
    } else {
      previousMatrix.current.copy(meshRef.current.matrix)
    }
  }

  const onDragEnd = async () => {
    if (!meshRef.current) return
    
    // We need to find the world Y to see if they dragged to a new shelf
    const pos = new THREE.Vector3()
    meshRef.current.getWorldPosition(pos)
    
    const fixtureData = useStore.getState().fixtureData
    let nearestShelfId = positionData.shelf_id
    let minDiff = Infinity
    for (const s of fixtureData.shelves) {
      const diff = Math.abs(s.vertical_position_y - pos.y)
      if (diff < minDiff) {
        minDiff = diff
        nearestShelfId = s.id
      }
    }

    try {
      const response = await axios.post(`http://localhost:8000/api/planogram/position/${positionData.id}/update`, {
        pos_x: meshRef.current.position.x,
        pos_y: meshRef.current.position.y,
        facings_wide: positionData.facings_wide,
        shelf_id: nearestShelfId
      })
      setSelectedProduct(product, response.data, response.data.dos)
      
      if (nearestShelfId !== positionData.shelf_id) {
        useStore.getState().fetchFixtureData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <PivotControls 
      activeAxes={[true, true, false]} 
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      scale={100}
      depthTest={false}
    >
      <mesh 
        ref={meshRef}
        position={[positionData.pos_x, calcY, 0]}
        onClick={handleClick}
      >
        <boxGeometry args={[w, h, d]} />
        <meshLambertMaterial color={product.color_hex} />
        <Edges scale={1} threshold={15} color="rgba(0,0,0,0.5)" />
      </mesh>
    </PivotControls>
  )
}
