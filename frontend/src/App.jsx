import React, { useEffect } from 'react'
import axios from 'axios'
import Scene from './components/Scene'
import AnalyticsPanel from './components/AnalyticsPanel'
import { useStore } from './store'

function App() {
  const setFixtureData = useStore((state) => state.setFixtureData)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/planogram/1')
        setFixtureData(response.data)
      } catch (error) {
        console.error('Error fetching planogram data:', error)
      }
    }
    fetchData()
  }, [setFixtureData])

  return (
    <>
      <Scene />
      <AnalyticsPanel />
    </>
  )
}

export default App
