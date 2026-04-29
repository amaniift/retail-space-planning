import React, { useEffect } from 'react'
import { useStore } from '../store'

export default function FixtureSelector() {
  const stores = useStore((state) => state.stores)
  const fixtures = useStore((state) => state.fixtures)
  const selectedStoreId = useStore((state) => state.selectedStoreId)
  const selectedFixtureId = useStore((state) => state.selectedFixtureId)
  const fetchStores = useStore((state) => state.fetchStores)
  const fetchFixturesForStore = useStore((state) => state.fetchFixturesForStore)
  const setSelectedStoreId = useStore((state) => state.setSelectedStoreId)
  const setSelectedFixtureId = useStore((state) => state.setSelectedFixtureId)
  const fetchFixtureData = useStore((state) => state.fetchFixtureData)

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  useEffect(() => {
    if (!stores.length) return

    const storeToUse = selectedStoreId ?? stores[0].id
    if (storeToUse !== selectedStoreId) {
      setSelectedStoreId(storeToUse)
      return
    }

    fetchFixturesForStore(storeToUse).then((storeFixtures) => {
      if (!storeFixtures.length) return

      const fixtureToUse = storeFixtures.some((fixture) => fixture.id === selectedFixtureId)
        ? selectedFixtureId
        : storeFixtures[0].id

      if (fixtureToUse !== selectedFixtureId) {
        setSelectedFixtureId(fixtureToUse)
      }
    })
  }, [stores, selectedStoreId, selectedFixtureId, fetchFixturesForStore, setSelectedStoreId, setSelectedFixtureId])

  useEffect(() => {
    if (selectedFixtureId) {
      fetchFixtureData(selectedFixtureId)
    }
  }, [selectedFixtureId, fetchFixtureData])

  return (
    <div className="fixture-selector">
      <h2>Store & Fixture</h2>
      <label>
        Store
        <select
          value={selectedStoreId ?? ''}
          onChange={(e) => {
            const storeId = Number(e.target.value)
            setSelectedStoreId(storeId)
            setSelectedFixtureId(null)
            fetchFixturesForStore(storeId).then((storeFixtures) => {
              if (storeFixtures.length) {
                setSelectedFixtureId(storeFixtures[0].id)
              }
            })
          }}
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Fixture
        <select
          value={selectedFixtureId ?? ''}
          onChange={(e) => setSelectedFixtureId(Number(e.target.value))}
        >
          {fixtures.map((fixture) => (
            <option key={fixture.id} value={fixture.id}>
              {fixture.name}
            </option>
          ))}
        </select>
      </label>

      <p className="fixture-selector-hint">
        Pick a store first, then choose a fixture to view and edit its planogram.
      </p>
    </div>
  )
}