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
      useStore.getState().fetchWorkflow(id)
    } catch (error) {
      console.error(error)
    }
  },
  // undo/redo stacks hold snapshots of fixtureData
  undoStack: [],
  redoStack: [],
  pushUndoSnapshot: () => {
    const state = useStore.getState()
    if (!state.fixtureData) return
    const snapshot = { fixtureId: state.fixtureData.id, snapshot: state.fixtureData }
    const next = [snapshot, ...state.undoStack].slice(0, 50) // limit
    useStore.setState({ undoStack: next, redoStack: [] })
  },
  applySnapshot: async (snap) => {
    try {
      const current = await axios.get(`http://localhost:8000/api/planogram/${snap.fixtureId}`)
      // delete existing positions
      for (const shelf of current.data.shelves) {
        for (const pos of shelf.positions) {
          try { await axios.delete(`http://localhost:8000/api/planogram/position/${pos.id}`) } catch (e) { }
        }
      }

      // recreate from snapshot
      for (const shelf of snap.snapshot.shelves) {
        for (const pos of shelf.positions) {
          const body = {
            product_id: pos.product.id,
            shelf_id: shelf.id,
            pos_x: pos.pos_x,
            pos_y: pos.pos_y,
            facings_wide: pos.facings_wide
          }
          try { await axios.post('http://localhost:8000/api/planogram/position/add', body) } catch (e) { console.error(e) }
        }
      }

      // refresh
      useStore.getState().fetchFixtureData(snap.fixtureId)
    } catch (err) {
      console.error(err)
    }
  },
  undo: async () => {
    const state = useStore.getState()
    if (!state.undoStack || state.undoStack.length === 0) return
    const [latest, ...rest] = state.undoStack
    // push current to redo
    const current = state.fixtureData ? { fixtureId: state.fixtureData.id, snapshot: state.fixtureData } : null
    const nextRedo = current ? [current, ...state.redoStack].slice(0, 50) : state.redoStack
    useStore.setState({ undoStack: rest, redoStack: nextRedo })
    if (latest) await state.applySnapshot(latest)
  },
  redo: async () => {
    const state = useStore.getState()
    if (!state.redoStack || state.redoStack.length === 0) return
    const [latest, ...rest] = state.redoStack
    // push current to undo
    const current = state.fixtureData ? { fixtureId: state.fixtureData.id, snapshot: state.fixtureData } : null
    const nextUndo = current ? [current, ...state.undoStack].slice(0, 50) : state.undoStack
    useStore.setState({ redoStack: rest, undoStack: nextUndo })
    if (latest) await state.applySnapshot(latest)
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
  createFixture: async (payload) => {
    const response = await axios.post('http://localhost:8000/api/fixtures', payload)
    const createdFixture = response.data
    const state = useStore.getState()
    const nextFixtures = [createdFixture, ...state.fixtures.filter((fixture) => fixture.id !== createdFixture.id)]
    set({ fixtures: nextFixtures, selectedFixtureId: createdFixture.id })
    setTimeout(() => {
      useStore.getState().fetchFixturesForStore(createdFixture.store_id)
    }, 0)
    return createdFixture
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
  previewRecommendations: [],
  setPreviewRecommendations: (recs) => set({ previewRecommendations: recs || [] }),
  clearPreviewRecommendations: () => set({ previewRecommendations: [] }),
  pendingPlacementProduct: null,
  setPendingPlacementProduct: (product) => set({ pendingPlacementProduct: product }),
  
  users: [],
  currentUser: null,
  fetchUsers: async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/users')
      set({ users: response.data })
      if (response.data.length > 0) set({ currentUser: response.data[0] })
    } catch (e) {
      console.error(e)
    }
  },
  setCurrentUser: (userId) => set((state) => ({
    currentUser: state.users.find(u => u.id === parseInt(userId)) || state.currentUser
  })),

  workflow: null,
  fetchWorkflow: async (fixtureId) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/planogram/${fixtureId}/workflow`)
      set({ workflow: res.data })
    } catch (e) {
      console.error(e)
    }
  },
  updateWorkflow: async (status) => {
    const state = useStore.getState()
    if (!state.currentUser || !state.fixtureData) return
    try {
      const res = await axios.post(`http://localhost:8000/api/planogram/${state.fixtureData.id}/workflow`, {
        status,
        user_id: state.currentUser.id
      })
      set({ workflow: res.data })
    } catch (e) {
      console.error(e)
    }
  },
  addComment: async (positionId, text) => {
    const state = useStore.getState()
    if (!state.currentUser || !text) return
    try {
      await axios.post('http://localhost:8000/api/comments', {
        user_id: state.currentUser.id,
        position_id: positionId,
        text
      })
      await state.fetchFixtureData(state.fixtureData.id)
    } catch (e) {
      console.error(e)
    }
  },
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }))
}))
