import React, { useEffect } from 'react'
import Scene from './components/Scene'
import AnalyticsPanel from './components/AnalyticsPanel'
import ProductLibrary from './components/ProductLibrary'
import { useStore } from './store'

function App() {
  const fetchFixtureData = useStore((state) => state.fetchFixtureData)
  const fetchProducts = useStore((state) => state.fetchProducts)
  const pendingPlacementProduct = useStore((state) => state.pendingPlacementProduct)

  useEffect(() => {
    fetchFixtureData()
    fetchProducts()
  }, [fetchFixtureData, fetchProducts])

  return (
    <div style={{ cursor: pendingPlacementProduct ? 'crosshair' : 'default', width: '100vw', height: '100vh' }}>
      <ProductLibrary />
      <Scene />
      <AnalyticsPanel />
    </div>
  )
}

export default App
