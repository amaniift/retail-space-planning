import React, { useEffect, useMemo, useState } from 'react'
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
  const createFixture = useStore((state) => state.createFixture)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [form, setForm] = useState({
    name: '',
    type: 'Gondola',
    width: '1200',
    height: '2000',
    depth: '500',
    base_height: '200',
    number_of_shelves: '4'
  })

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [stores, selectedStoreId]
  )

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

  useEffect(() => {
    if (!selectedStore && stores.length) {
      setForm((current) => ({ ...current, name: current.name || `${stores[0].name} New Fixture` }))
    }
  }, [selectedStore, stores])

  const handleCreateFixture = async (event) => {
    event.preventDefault()
    if (!selectedStoreId) {
      setCreateError('Select a store first.')
      return
    }

    setCreateError('')
    setCreateSuccess('')

    try {
      const createdFixture = await createFixture({
        store_id: selectedStoreId,
        name: form.name.trim() || `${selectedStore?.name ?? 'Store'} Fixture`,
        type: form.type,
        width: Number(form.width),
        height: Number(form.height),
        depth: Number(form.depth),
        base_height: Number(form.base_height),
        number_of_shelves: Number(form.number_of_shelves)
      })

      await fetchFixturesForStore(selectedStoreId)
      setSelectedFixtureId(createdFixture.id)
      await fetchFixtureData(createdFixture.id)
      setCreateSuccess(`Created ${createdFixture.name} and opened it for editing.`)
      setShowCreateForm(false)
    } catch (error) {
      console.error(error)
      setCreateError(error?.response?.data?.detail || 'Failed to create fixture.')
    }
  }

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

      <button
        type="button"
        className="secondary-btn"
        onClick={() => setShowCreateForm((value) => !value)}
        style={{ width: '100%', marginTop: 10 }}
      >
        {showCreateForm ? 'Close Create Fixture' : 'Create Fixture'}
      </button>

      {showCreateForm && (
        <form className="create-fixture-form" onSubmit={handleCreateFixture}>
          <label>
            Fixture name
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Main Gondola A"
            />
          </label>

          <label>
            Type
            <input
              value={form.type}
              onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}
              placeholder="Gondola"
            />
          </label>

          <div className="fixture-grid">
            <label>
              Width
              <input
                type="number"
                value={form.width}
                onChange={(e) => setForm((current) => ({ ...current, width: e.target.value }))}
                min="1"
                step="0.1"
              />
            </label>
            <label>
              Height
              <input
                type="number"
                value={form.height}
                onChange={(e) => setForm((current) => ({ ...current, height: e.target.value }))}
                min="1"
                step="0.1"
              />
            </label>
            <label>
              Depth
              <input
                type="number"
                value={form.depth}
                onChange={(e) => setForm((current) => ({ ...current, depth: e.target.value }))}
                min="1"
                step="0.1"
              />
            </label>
            <label>
              Base height
              <input
                type="number"
                value={form.base_height}
                onChange={(e) => setForm((current) => ({ ...current, base_height: e.target.value }))}
                min="0"
                step="0.1"
              />
            </label>
            <label>
              Shelves
              <input
                type="number"
                value={form.number_of_shelves}
                onChange={(e) => setForm((current) => ({ ...current, number_of_shelves: e.target.value }))}
                min="1"
                step="1"
              />
            </label>
          </div>

          {createError && <div className="fixture-form-error">{createError}</div>}
          {createSuccess && <div className="fixture-form-success">{createSuccess}</div>}

          <button type="submit" className="primary-btn" style={{ width: '100%', marginTop: 8 }}>
            Create and Open Fixture
          </button>
        </form>
      )}
    </div>
  )
}