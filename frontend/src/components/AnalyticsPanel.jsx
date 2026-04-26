import React from 'react'
import { useStore } from '../store'

export default function AnalyticsPanel() {
  const selectedProduct = useStore((state) => state.selectedProduct)

  if (!selectedProduct) {
    return (
      <div className="analytics-panel">
        <h2>Analytics</h2>
        <p>Click a product to view details.</p>
      </div>
    )
  }

  const { product, position, dos } = selectedProduct
  const isDosWarning = dos < 7.0

  const capacity = position.facings_wide * position.facings_high * position.facings_deep

  return (
    <div className="analytics-panel">
      <h2>Analytics</h2>
      
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
    </div>
  )
}
