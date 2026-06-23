import { useContext } from 'react'
import { Navigate } from 'react-router'
import { logout, getDefaultSession } from '@inrupt/solid-client-authn-browser'
import { SessionContext } from '../SessionContext'

function Dashboard() {
  const { session, setSession } = useContext(SessionContext)

  if (!session.info.isLoggedIn) {
    return <Navigate to="/" replace />
  }

  async function handleLogout() {
    await logout()
    setSession(getDefaultSession())
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-lumon-bg px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-lumon-fg text-center">BiobankPODS</h1>
        <p className="mt-2 text-center text-lumon-subtle">You are connected to your POD.</p>

        <div className="mt-8 rounded-lg border border-lumon-border bg-lumon-surface p-5 space-y-2">
          <p className="text-sm font-medium text-lumon-subtle">Logged in as</p>
          <p className="text-sm text-lumon-fg break-all">{session.info.webId}</p>
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 w-full rounded-lg border border-lumon-border px-4 py-2.5 font-semibold text-lumon-fg hover:bg-lumon-surface focus:outline-none focus:ring-2 focus:ring-lumon-muted/50 transition-colors"
        >
          Log out
        </button>
      </div>
    </main>
  )
}

export default Dashboard
