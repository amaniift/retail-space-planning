import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera, OrbitControls, KeyboardControls, useKeyboardControls } from '@react-three/drei'
import Fixture from './Fixture'
import { useStore } from '../store'

function CameraControls() {
  const [, get] = useKeyboardControls()
  const controlsRef = useRef()

  useFrame(() => {
    if (!controlsRef.current) return
    const { forward, backward, left, right } = get()
    
    const moveSpeed = 20
    if (forward) controlsRef.current.target.y += moveSpeed
    if (backward) controlsRef.current.target.y -= moveSpeed
    if (left) controlsRef.current.target.x -= moveSpeed
    if (right) controlsRef.current.target.x += moveSpeed
    
    controlsRef.current.update()
  })

  return (
    <OrbitControls 
      ref={controlsRef}
      enableRotate={true} 
      enableZoom={true} 
      enablePan={true} 
      mouseButtons={{
        LEFT: 0, // ROTATE
        RIGHT: 2, // PAN
        MIDDLE: 1 // DOLLY
      }}
    />
  )
}

export default function Scene() {
  const fixtureData = useStore((state) => state.fixtureData)

  return (
    <KeyboardControls
      map={[
        { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
        { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
        { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
        { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
      ]}
    >
      <Canvas>
        <OrthographicCamera makeDefault position={[0, 1000, 3000]} zoom={0.5} near={-5000} far={10000} />
        <CameraControls />
        <ambientLight intensity={0.6} />
        <directionalLight position={[1000, 1000, 1000]} castShadow />
        
        {fixtureData && <Fixture data={fixtureData} />}
      </Canvas>
    </KeyboardControls>
  )
}
