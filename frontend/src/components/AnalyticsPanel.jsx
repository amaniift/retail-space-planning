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

  const [recommendations, setRecommendations] = React.useState(null)
  const [loadingRecs, setLoadingRecs] = React.useState(false)
  const [commentText, setCommentText] = React.useState('')
  const [isMinimized, setIsMinimized] = React.useState(false)

  const freshPosition = React.useMemo(() => {
    if (!fixtureData || !selectedProduct?.position) return selectedProduct?.position
    for (const shelf of fixtureData.shelves) {
      const found = shelf.positions.find(p => p.id === selectedProduct.position.id)
      if (found) return found
    }
    return selectedProduct.position
  }, [fixtureData, selectedProduct])

  if (!selectedProduct) {
    return (
      <div className="analytics-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMinimized ? 0 : 16 }}>
          <h2 style={{ margin: 0 }}>Analytics</h2>
          <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
            {isMinimized ? '+' : '−'}
          </button>
        </div>
        {!isMinimized && (
        <>
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
          <div style={{ marginTop: 12 }}>
            <button
              className="primary-btn"
              onClick={async () => {
                if (!fixtureData) return
                try {
                  setLoadingRecs(true)
                  const res = await axios.post(`http://localhost:8000/api/planogram/${fixtureData.id}/recommendations`, {})
                  const recs = res.data.recommendations || []
                  setRecommendations(recs)
                  useStore.getState().setPreviewRecommendations(recs)
                } catch (err) {
                  console.error(err)
                } finally {
                  setLoadingRecs(false)
                }
              }}
            >
              {loadingRecs ? 'Generating…' : 'Get Recommendations'}
            </button>

            <button
              className="secondary-btn"
              style={{ marginLeft: 8 }}
              disabled={!recommendations || recommendations.length === 0}
              onClick={async () => {
                if (!fixtureData || !recommendations) return
                try {
                  // save undo snapshot
                  useStore.getState().pushUndoSnapshot()
                  await axios.post(`http://localhost:8000/api/planogram/${fixtureData.id}/apply_recommendations`, {})
                  setRecommendations(null)
                  useStore.getState().clearPreviewRecommendations()
                  fetchFixtureData()
                } catch (err) {
                  console.error(err)
                }
              }}
            >
              Apply Recommendations
            </button>

            <button
              className="secondary-btn"
              style={{ marginLeft: 8 }}
              disabled={!recommendations || recommendations.length === 0}
              onClick={() => {
                setRecommendations(null)
                useStore.getState().clearPreviewRecommendations()
              }}
            >
              Clear Preview
            </button>

            {recommendations && (
              <div style={{ marginTop: 8, color: '#aaa', fontSize: '0.9rem' }}>
                Suggested placements: {recommendations.length}
              </div>
            )}

            {recommendations && recommendations.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 160, overflow: 'auto', padding: 8, border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8 }}>
                {recommendations.map((r, i) => {
                  const prod = useStore.getState().products.find(p => p.id === r.product_id)
                  return (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 600 }}>{prod ? prod.name : `Product ${r.product_id}`}</div>
                      <div style={{ fontSize: '0.85rem', color: '#bbb' }}>Shelf: {r.shelf_id} • X: {r.pos_x.toFixed(1)} • Facings: {r.facings_wide} • HxD: {r.facings_high}x{r.facings_deep}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          </div>
        ) : (
          <p>Loading fixture analytics…</p>
        )}
        </>
        )}
      </div>
    )
  }

  const { product, position, dos } = selectedProduct
  const isDosWarning = dos < 7.0

  const capacity = position.facings_wide * position.facings_high * position.facings_deep

  return (
    <div className="analytics-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMinimized ? 0 : 16 }}>
        <h2 style={{ margin: 0 }}>Analytics</h2>
        <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
          {isMinimized ? '+' : '−'}
        </button>
      </div>
      {!isMinimized && (
      <>
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

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '15px 0' }} />
      
      <h3 style={{ fontSize: '1rem', marginTop: 0 }}>Comments</h3>
      <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {freshPosition.comments && freshPosition.comments.length > 0 ? (
          freshPosition.comments.map(c => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 6, fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{c.user?.username || 'Unknown'} <span style={{ fontWeight: 'normal', color: '#888', fontSize: '0.75rem' }}>• {new Date(c.created_at).toLocaleString()}</span></div>
                <div style={{ color: '#ddd' }}>{c.text}</div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#888' }}>No comments yet.</div>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
        <input 
          type="text" 
          value={commentText} 
          onChange={e => setCommentText(e.target.value)} 
          placeholder="Add a comment..."
          style={{ flex: 1, padding: '8px', minWidth: 0, borderRadius: 6, background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <button 
          className="primary-btn" 
          onClick={() => {
            if(commentText) {
              useStore.getState().addComment(freshPosition.id, commentText)
              setCommentText('')
            }
          }}
        >
          Post
        </button>
      </div>

      <button
        style={{ marginTop: '20px', width: '100%' }}
        className="cancel-btn"
        onClick={async () => {
          try {
            // push undo snapshot before deleting
            useStore.getState().pushUndoSnapshot()
            await axios.delete(`http://localhost:8000/api/planogram/position/${position.id}`)
            setSelectedProduct(null)
            await fetchFixtureData(fixtureData.id)
          } catch (err) {
            console.error(err)
          }
        }}
      >
        Remove from Planogram
      </button>
      </>
      )}
    </div>
  )
}
