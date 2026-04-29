import { create } from 'zustand'
import axios from 'axios'

export const useStore = create((set) => ({
  selectedProduct: null,
  setSelectedProduct: (product, position, dos) => {
    if (!product) set({ selectedProduct: null })
    else set({ selectedProduct: { product, position, dos } })
  },
  clearSelectedProduct: () => set({ selectedProduct: null }),
  fixtureData: null,
  setFixtureData: (data) => set({ fixtureData: data }),
  fetchFixtureData: async (fixtureId) => {
    try {
      let id = fixtureId
      if (!id) {
        const params = new URLSearchParams(window.location.search)
        id = params.get('fixture_id') || params.get('fixtureId') || '1'
      }
      const response = await axios.get(`http://localhost:8000/api/planogram/${id}`)
      set({ fixtureData: response.data })
    } catch (error) {
      console.error(error)
    }
  },
  stores: [],
  setStores: (stores) => set({ stores }),
  selectedStoreId: null,
  setSelectedStoreId: (storeId) => set({ selectedStoreId: storeId }),
  fixtures: [],
  setFixtures: (fixtures) => set({ fixtures }),
  selectedFixtureId: null,
  setSelectedFixtureId: (fixtureId) => set({ selectedFixtureId: fixtureId }),
  fetchStores: async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/stores')
      set({ stores: res.data })
    } catch (err) {
      console.error(err)
    }
  },
  fetchFixturesForStore: async (storeId) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/store/${storeId}/fixtures`)
      set({ fixtures: res.data })
      return res.data
    } catch (err) {
      console.error(err)
      return []
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
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }))
}))
