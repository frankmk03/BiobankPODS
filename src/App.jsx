import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router'
import { handleIncomingRedirect, getDefaultSession } from '@inrupt/solid-client-authn-browser'
import { SessionContext } from './SessionContext'
import Home from './pages/Home.jsx'
import FileBrowser from './pages/FileBrowser.jsx'

function App() {
  const [session, setSession] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    handleIncomingRedirect({
      url: window.location.href,
      restorePreviousSession: true,
    })
      .then(() => {
        const s = getDefaultSession()
        setSession(s)
        if (s.info.isLoggedIn) {
          navigate('/dashboard', { replace: true })
        }
      })
      .catch((err) => {
        console.error('handleIncomingRedirect error:', err)
        setSession(getDefaultSession())
      })
  }, [])

  if (session === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-lumon-bg">
        <p className="text-lumon-subtle">Loading…</p>
      </main>
    )
  }

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<FileBrowser />} />
      </Routes>
    </SessionContext.Provider>
  )
}

export default App
