import React, { useRef, useMemo } from 'react'
import { PivotControls, RoundedBox, Edges } from '@react-three/drei'
import { useStore } from '../store'
import axios from 'axios'
import * as THREE from 'three'

export default function ProductMesh({ positionData, shelfY, allPositions }) {
  const meshRef = useRef()
  const previousMatrix = useRef(new THREE.Matrix4())
  const setSelectedProduct = useStore((state) => state.setSelectedProduct)
  const setPlacementWarnings = useStore((state) => state.setPlacementWarnings)
  const currentUser = useStore((state) => state.currentUser)
  const isViewer = currentUser?.role === 'viewer'

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

  // Pre-calculate individual unit positions for performance
  const unitPositions = useMemo(() => {
    const positions = [];
    const fw = positionData.facings_wide;
    const fh = positionData.facings_high;
    const fd = positionData.facings_deep;
    
    const pw = product.width;
    const ph = product.height;
    const pd = product.depth;

    for (let x = 0; x < fw; x++) {
      for (let y = 0; y < fh; y++) {
        for (let z = 0; z < fd; z++) {
          positions.push([
            (x - (fw - 1) / 2) * pw,
            (y - (fh - 1) / 2) * ph,
            (z - (fd - 1) / 2) * pd
          ]);
        }
      }
    }
    return positions;
  }, [positionData, product]);

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

      const otherMin = new THREE.Vector3(other.pos_x - otherW / 2, otherY - otherH / 2, -otherD / 2)
      const otherMax = new THREE.Vector3(other.pos_x + otherW / 2, otherY + otherH / 2, otherD / 2)
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
      // save snapshot for undo
      useStore.getState().pushUndoSnapshot()
      const response = await axios.post(`http://localhost:8000/api/planogram/position/${positionData.id}/update`, {
        pos_x: meshRef.current.position.x,
        pos_y: meshRef.current.position.y,
        facings_wide: positionData.facings_wide,
        shelf_id: nearestShelfId
      })
      setPlacementWarnings(response.data?.warnings || [])
      setSelectedProduct(product, response.data, response.data.dos)

      if (nearestShelfId !== positionData.shelf_id) {
        await useStore.getState().fetchFixtureData(fixtureData.id)
      }
    } catch (err) {
      const message = err?.response?.data?.detail || 'Unable to move product.'
      setPlacementWarnings([message])
      if (meshRef.current) {
        meshRef.current.matrix.copy(previousMatrix.current)
        meshRef.current.matrix.decompose(meshRef.current.position, meshRef.current.quaternion, meshRef.current.scale)
        meshRef.current.updateMatrixWorld()
      }
      console.error(err)
      await useStore.getState().fetchFixtureData(fixtureData.id)
    }
  }

  return isViewer ? (
    <group
      ref={meshRef}
      position={[positionData.pos_x, calcY, 0]}
      onClick={handleClick}
    >
      {/* Outline for the total volume */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial transparent opacity={0} />
        <Edges scale={1} threshold={15} color="rgba(255, 255, 255, 0.4)" />
      </mesh>

      {/* Individual units */}
      {unitPositions.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <boxGeometry args={[product.width * 0.96, product.height * 0.96, product.depth * 0.96]} />
          <meshPhysicalMaterial
            color={product.color_hex}
            roughness={0.42}
            metalness={0.08}
            clearcoat={0.18}
            clearcoatRoughness={0.55}
          />
        </mesh>
      ))}
    </group>
  ) : (
    <PivotControls
      activeAxes={[true, true, false]}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      scale={100}
      depthTest={false}
    >
      <group
        ref={meshRef}
        position={[positionData.pos_x, calcY, 0]}
        onClick={handleClick}
      >
        {/* Outline for the total volume */}
        <mesh>
          <boxGeometry args={[w, h, d]} />
          <meshBasicMaterial transparent opacity={0} />
          <Edges scale={1} threshold={15} color="rgba(255, 255, 255, 0.6)" />
        </mesh>

        {/* Individual units */}
        {unitPositions.map((pos, idx) => (
          <mesh key={idx} position={pos}>
            <boxGeometry args={[product.width * 0.96, product.height * 0.96, product.depth * 0.96]} />
            <meshPhysicalMaterial
              color={product.color_hex}
              roughness={0.42}
              metalness={0.08}
              clearcoat={0.18}
              clearcoatRoughness={0.55}
            />
          </mesh>
        ))}
      </group>
    </PivotControls>
  )
}
