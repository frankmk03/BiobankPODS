import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router'
import { handleIncomingRedirect, getDefaultSession } from '@inrupt/solid-client-authn-browser'
import { SessionContext } from './SessionContext'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    handleIncomingRedirect({ restorePreviousSession: true }).then(() => {
      setSession(getDefaultSession())
    })
  }, [])

  if (session === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </main>
    )
  }

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </SessionContext.Provider>
  )
}

export default App
