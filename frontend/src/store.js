import { create } from 'zustand'
import axios from 'axios'

export const useStore = create((set) => ({
  selectedProduct: null,
  setSelectedProduct: (product, position, dos) => {
    if (!product) set({ selectedProduct: null })
    else set({ selectedProduct: { product, position, dos } })
  },
  fixtureData: null,
  setFixtureData: (data) => set({ fixtureData: data }),
  fetchFixtureData: async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/planogram/1')
      set({ fixtureData: response.data })
    } catch (error) {
      console.error(error)
    }
  },
  products: [],
  fetchProducts: async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/products')
      set({ products: response.data })
    } catch (error) {
      console.error(error)
    }
  },
  pendingPlacementProduct: null,
  setPendingPlacementProduct: (product) => set({ pendingPlacementProduct: product }),
}))
