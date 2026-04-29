import React, { useState } from 'react'
import { useStore } from '../store'

export default function ProductLibrary() {
  const products = useStore((state) => state.products)
  const pendingPlacementProduct = useStore((state) => state.pendingPlacementProduct)
  const setPendingPlacementProduct = useStore((state) => state.setPendingPlacementProduct)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="product-library">
      <h2>Product Library</h2>
      <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '10px' }}>
        Click to select, then click a shelf to place.
      </p>
      <input 
        type="text" 
        placeholder="Search products by name or SKU..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-bar"
      />
      <div className="product-list">
        {filteredProducts.map((product) => (
          <div 
            key={product.id} 
            className={`product-item ${pendingPlacementProduct?.id === product.id ? 'selected' : ''}`}
            onClick={() => setPendingPlacementProduct(product)}
            style={{ borderLeft: `4px solid ${product.color_hex}` }}
          >
            <div className="product-item-title">{product.name}</div>
            <div className="product-item-sku">SKU: {product.sku}</div>
          </div>
        ))}
      </div>
      {pendingPlacementProduct && (
        <button 
          className="cancel-btn" 
          onClick={() => setPendingPlacementProduct(null)}
        >
          Cancel Placement
        </button>
      )}
    </div>
  )
}
