import React, { useEffect } from 'react'
import Scene from './components/Scene'
import AnalyticsPanel from './components/AnalyticsPanel'
import ProductLibrary from './components/ProductLibrary'
import FixtureSelector from './components/FixtureSelector'
import VersionControl from './components/VersionControl'
import TemplateLibrary from './components/TemplateLibrary'
import { useStore } from './store'

function App() {
  const fetchProducts = useStore((state) => state.fetchProducts)
  const pendingPlacementProduct = useStore((state) => state.pendingPlacementProduct)
  const toggleTheme = useStore((state) => state.toggleTheme)
  const theme = useStore((state) => state.theme)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // apply theme class to body
  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light')
  }, [theme])

  return (
    <div style={{ cursor: pendingPlacementProduct ? 'crosshair' : 'default', width: '100vw', height: '100vh' }}>
      <button onClick={toggleTheme} style={{ position: 'absolute', top: 20, right: 340, zIndex: 50 }}>
        Toggle Theme
      </button>
      <FixtureSelector />
      <ProductLibrary />
      <VersionControl />
      <TemplateLibrary />
      <Scene />
      <AnalyticsPanel />
    </div>
  )
}

export default App
