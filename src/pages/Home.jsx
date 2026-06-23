import { useContext, useState } from 'react'
import { Navigate } from 'react-router'
import { login } from '@inrupt/solid-client-authn-browser'
import { SessionContext } from '../SessionContext'

function Home() {
  const { session } = useContext(SessionContext)
  const [serverUrl, setServerUrl] = useState('')
  const [error, setError] = useState('')

  if (session.info.isLoggedIn) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    let issuer = serverUrl.trim()
    if (!issuer) {
      setError('Please enter your POD server URL.')
      return
    }
    if (!issuer.startsWith('http')) {
      issuer = 'https://' + issuer
    }

    try {
      await login({
        oidcIssuer: issuer,
        redirectUrl: window.location.origin + '/',
        clientName: 'BiobankPODS',
      })
    } catch {
      setError('Could not connect to that server. Check the URL and try again.')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 text-center">BiobankPODS</h1>
        <p className="mt-2 text-center text-gray-500">
          Biobank data sharing powered by Solid PODs
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-3">
          <label htmlFor="server-url" className="block text-sm font-medium text-gray-700">
            Your POD server URL
          </label>
          <input
            id="server-url"
            type="url"
            placeholder="https://solidcommunity.net"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
          >
            Log in with Solid
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Don&apos;t have a POD?{' '}
          <a
            href="https://solidcommunity.net/register"
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 hover:underline"
          >
            Create one at solidcommunity.net
          </a>
        </p>
      </div>
    </main>
  )
}

export default Home
