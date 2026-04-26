import { create } from 'zustand'

export const useStore = create((set) => ({
  selectedProduct: null,
  setSelectedProduct: (product, position, dos) => set({ selectedProduct: { product, position, dos } }),
  fixtureData: null,
  setFixtureData: (data) => set({ fixtureData: data }),
}))
