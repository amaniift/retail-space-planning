import React from 'react'
import { useStore } from '../store'
import axios from 'axios'

export default function AnalyticsPanel() {
  const selectedProduct = useStore((state) => state.selectedProduct)
  const setSelectedProduct = useStore((state) => state.setSelectedProduct)
  const clearSelectedProduct = useStore((state) => state.clearSelectedProduct)
  const fetchFixtureData = useStore((state) => state.fetchFixtureData)
  const fixtureData = useStore((state) => state.fixtureData)

  const [fixtureAnalytics, setFixtureAnalytics] = React.useState(null)

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (!fixtureData) return
        const res = await axios.get(`http://localhost:8000/api/planogram/${fixtureData.id}/analytics`)
        setFixtureAnalytics(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchAnalytics()
  }, [fixtureData])

  if (!selectedProduct) {
    return (
      <div className="analytics-panel">
        <h2>Analytics</h2>
        {fixtureAnalytics ? (
          <div>
            <div className="stat-row">
              <span className="stat-label">Fixture ID:</span>
              <span className="stat-value">{fixtureAnalytics.fixture_id}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Per-shelf summary</strong>
              {fixtureAnalytics.shelves.map((s) => (
                <div key={s.shelf_id} style={{ marginTop: 8, borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: 8 }}>
                  <div className="stat-row"><span className="stat-label">Shelf:</span><span className="stat-value">{s.shelf_id}</span></div>
                  <div className="stat-row"><span className="stat-label">Capacity:</span><span className="stat-value">{s.total_capacity}</span></div>
                  <div className="stat-row"><span className="stat-label">Daily Movement:</span><span className="stat-value">{s.total_daily_movement.toFixed(2)}</span></div>
                  <div className="stat-row"><span className="stat-label">Est. Daily Revenue:</span><span className="stat-value">{s.estimated_daily_revenue.toFixed(2)}</span></div>
                  <div className="stat-row"><span className="stat-label">Avg DOS:</span><span className="stat-value">{s.avg_dos ? s.avg_dos.toFixed(2) : '—'}</span></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p>Loading fixture analytics…</p>
        )}
      </div>
    )
  }

  const { product, position, dos } = selectedProduct
  const isDosWarning = dos < 7.0

  const capacity = position.facings_wide * position.facings_high * position.facings_deep

  return (
    <div className="analytics-panel">
      <h2>Analytics</h2>
      <button
        className="secondary-btn"
        onClick={clearSelectedProduct}
        style={{ marginBottom: 12, width: '100%' }}
      >
        Back to Fixture Summary
      </button>
      
      <div className="stat-row">
        <span className="stat-label">SKU:</span>
        <span className="stat-value">{product.sku}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Brand:</span>
        <span className="stat-value">{product.brand}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Dimensions:</span>
        <span className="stat-value">{product.width.toFixed(1)} x {product.height.toFixed(1)} x {product.depth.toFixed(1)} mm</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Daily Movement:</span>
        <span className="stat-value">{product.performance ? product.performance.daily_unit_movement.toFixed(2) : 0}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Total Capacity:</span>
        <span className="stat-value">{capacity}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Days of Supply (DOS):</span>
        <span className={`stat-value ${isDosWarning ? 'dos-warning' : ''}`}>
          {dos.toFixed(2)}
        </span>
      </div>

      <button 
        style={{ marginTop: '20px', width: '100%' }}
        className="cancel-btn"
        onClick={async () => {
          try {
            await axios.delete(`http://localhost:8000/api/planogram/position/${position.id}`)
            setSelectedProduct(null)
            fetchFixtureData()
          } catch (err) {
            console.error(err)
          }
        }}
      >
        Remove from Planogram
      </button>
    </div>
  )
}
