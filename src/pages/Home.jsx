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
    <main className="min-h-screen flex flex-col items-center justify-center bg-lumon-bg px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-lumon-fg text-center">BiobankPODS</h1>
        <p className="mt-2 text-center text-lumon-subtle">
          Biobank data sharing powered by Solid PODs
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-3">
          <label htmlFor="server-url" className="block text-sm font-medium text-lumon-fg">
            Your POD server URL
          </label>
          <input
            id="server-url"
            type="url"
            placeholder="https://solidcommunity.net"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="w-full rounded-lg border border-lumon-border bg-lumon-surface px-4 py-2.5 text-lumon-fg placeholder-lumon-subtle focus:border-lumon-accent focus:outline-none focus:ring-2 focus:ring-lumon-accent/30"
          />
          {error && <p className="text-sm text-lumon-error">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-lumon-accent px-4 py-2.5 font-semibold text-lumon-bg hover:bg-lumon-accent-hover focus:outline-none focus:ring-2 focus:ring-lumon-accent/50 transition-colors"
          >
            Log in with Solid
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-lumon-subtle">
          Don&apos;t have a POD?{' '}
          <a
            href="https://solidcommunity.net/register"
            target="_blank"
            rel="noreferrer"
            className="text-lumon-accent hover:text-lumon-accent-hover hover:underline"
          >
            Create one at solidcommunity.net
          </a>
        </p>
      </div>
    </main>
  )
}

export default Home
