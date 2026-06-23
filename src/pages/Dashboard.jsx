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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 text-center">BiobankPODS</h1>
        <p className="mt-2 text-center text-gray-500">You are connected to your POD.</p>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 space-y-2">
          <p className="text-sm font-medium text-gray-500">Logged in as</p>
          <p className="text-sm text-gray-900 break-all">{session.info.webId}</p>
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 w-full rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
        >
          Log out
        </button>
      </div>
    </main>
  )
}

export default Dashboard
