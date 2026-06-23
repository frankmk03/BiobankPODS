import { useContext, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { logout } from '@inrupt/solid-client-authn-browser'
import {
  getSolidDataset,
  getContainedResourceUrlAll,
  getThing,
  getUrl,
  addUrl,
  setThing,
  saveSolidDatasetAt,
  createContainerAt,
  getResourceInfoWithAcl,
  getResourceAcl,
  hasResourceAcl,
  hasFallbackAcl,
  createAclFromFallbackAcl,
  setAgentResourceAccess,
  setPublicResourceAccess,
  saveAclFor,
} from '@inrupt/solid-client'
import { SessionContext } from '../SessionContext'

const STORAGE_PREDICATES = [
  'http://www.w3.org/ns/pim/space#storage',
  'http://www.w3.org/ns/solid/terms#storage',
]
const INBOX_PREDICATE = 'http://www.w3.org/ns/ldp#inbox'

function deriveStorageUrl(webId) {
  const url = new URL(webId)
  url.hash = ''
  const parts = url.pathname.replace(/\/[^/]+$/, '').split('/').filter(Boolean)
  const profileIdx = parts.indexOf('profile')
  const rootParts = profileIdx > 0 ? parts.slice(0, profileIdx) : parts.slice(0, -1)
  url.pathname = '/' + rootParts.join('/') + '/'
  return url.toString()
}

function itemName(url) {
  const clean = url.endsWith('/') ? url.slice(0, -1) : url
  return clean.split('/').pop()
}

async function ensureInbox(storageUrl, webId, sessionFetch) {
  const inboxUrl = storageUrl + 'inbox/'

  const check = await sessionFetch(inboxUrl, { method: 'HEAD' })
  if (check.ok) return

  // Create the inbox container
  await createContainerAt(inboxUrl, { fetch: sessionFetch })

  // Set ACL: owner gets full control, public gets append-only
  const inboxWithAcl = await getResourceInfoWithAcl(inboxUrl, { fetch: sessionFetch })
  let acl
  if (hasResourceAcl(inboxWithAcl)) {
    acl = getResourceAcl(inboxWithAcl)
  } else if (hasFallbackAcl(inboxWithAcl)) {
    acl = createAclFromFallbackAcl(inboxWithAcl)
  } else {
    return
  }

  acl = setAgentResourceAccess(acl, webId, {
    read: true, append: true, write: true, control: true,
  })
  acl = setPublicResourceAccess(acl, {
    read: false, append: true, write: false, control: false,
  })
  await saveAclFor(inboxWithAcl, acl, { fetch: sessionFetch })

  // Link the inbox in the WebID profile so others can discover it
  const profileUrl = webId.split('#')[0]
  const profileDataset = await getSolidDataset(profileUrl, { fetch: sessionFetch })
  const profileThing = getThing(profileDataset, webId)
  if (!getUrl(profileThing, INBOX_PREDICATE)) {
    const updated = setThing(profileDataset, addUrl(profileThing, INBOX_PREDICATE, inboxUrl))
    await saveSolidDatasetAt(profileUrl, updated, { fetch: sessionFetch })
  }
}

async function copyToInbox(resourceUrl, recipientWebId, sessionFetch) {
  if (resourceUrl.endsWith('/')) {
    throw new Error(`"${itemName(resourceUrl)}" is a folder — only files can be copied for now.`)
  }

  const profile = await getSolidDataset(recipientWebId, { fetch: sessionFetch })
  const thing = getThing(profile, recipientWebId)
  const inboxUrl = getUrl(thing, INBOX_PREDICATE)
  if (!inboxUrl) throw new Error("Could not find the recipient's inbox.")

  const response = await sessionFetch(resourceUrl)
  if (!response.ok) throw new Error(`Could not read "${itemName(resourceUrl)}".`)

  const content = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'application/octet-stream'

  const post = await sessionFetch(inboxUrl, {
    method: 'POST',
    headers: { 'content-type': contentType, 'slug': itemName(resourceUrl) },
    body: content,
  })

  if (!post.ok) throw new Error(`Could not deliver to inbox (${post.status}).`)
}

function ShareModal({ selected, onClose, sessionFetch }) {
  const [recipientWebId, setRecipientWebId] = useState('')
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState([])
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors([])
    setSending(true)

    const webId = recipientWebId.trim()
    if (!webId) {
      setErrors(['Please enter a WebID.'])
      setSending(false)
      return
    }

    const errs = []
    for (const url of selected) {
      try {
        await copyToInbox(url, webId, sessionFetch)
      } catch (err) {
        errs.push(err.message)
      }
    }

    setSending(false)
    if (errs.length === 0) {
      setDone(true)
      setTimeout(onClose, 1500)
    } else {
      setErrors(errs)
    }
  }

  const fileCount = [...selected].filter(u => !u.endsWith('/')).length
  const folderCount = selected.size - fileCount

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-lumon-surface border border-lumon-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-lumon-fg mb-1">Send copy</h2>
        <p className="text-sm text-lumon-subtle mb-5">
          {fileCount} file{fileCount !== 1 ? 's' : ''} will be copied to the recipient's inbox.
          {folderCount > 0 && ` (${folderCount} folder${folderCount !== 1 ? 's' : ''} will be skipped.)`}
        </p>

        {done ? (
          <p className="text-sm text-lumon-accent">Sent successfully.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-lumon-fg mb-1">
                Recipient WebID
              </label>
              <input
                type="url"
                placeholder="https://example.solidcommunity.net/profile/card#me"
                value={recipientWebId}
                onChange={e => setRecipientWebId(e.target.value)}
                className="w-full rounded-lg border border-lumon-border bg-lumon-bg px-4 py-2.5 text-lumon-fg placeholder-lumon-subtle focus:border-lumon-accent focus:outline-none focus:ring-2 focus:ring-lumon-accent/30"
              />
            </div>

            {errors.length > 0 && (
              <ul className="space-y-1">
                {errors.map((err, i) => (
                  <li key={i} className="text-sm text-lumon-error">{err}</li>
                ))}
              </ul>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={sending}
                className="flex-1 rounded-lg bg-lumon-accent px-4 py-2.5 font-semibold text-lumon-bg hover:bg-lumon-accent-hover disabled:opacity-50 transition-colors"
              >
                {sending ? 'Sending…' : 'Send copy'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-lumon-border px-4 py-2.5 font-semibold text-lumon-fg hover:bg-lumon-bg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function FileBrowser() {
  const { session } = useContext(SessionContext)
  const navigate = useNavigate()
  const [currentUrl, setCurrentUrl] = useState(null)
  const [items, setItems] = useState([])
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    if (!session.info.isLoggedIn) return

    async function initStorage() {
      try {
        const profile = await getSolidDataset(session.info.webId, { fetch: session.fetch })
        const thing = getThing(profile, session.info.webId)
        let storageUrl = null
        for (const predicate of STORAGE_PREDICATES) {
          storageUrl = getUrl(thing, predicate)
          if (storageUrl) break
        }
        if (!storageUrl) storageUrl = deriveStorageUrl(session.info.webId)

        await ensureInbox(storageUrl, session.info.webId, session.fetch)

        setBreadcrumbs([{ url: storageUrl, name: 'My POD' }])
        setCurrentUrl(storageUrl)
      } catch (e) {
        setError(e.message)
        setLoading(false)
      }
    }

    initStorage()
  }, [session])

  useEffect(() => {
    if (!currentUrl) return

    async function fetchContainer() {
      setLoading(true)
      setError('')
      setSelected(new Set())
      try {
        const dataset = await getSolidDataset(currentUrl, { fetch: session.fetch })
        const urls = getContainedResourceUrlAll(dataset)
        setItems(urls.map(url => ({ url, isContainer: url.endsWith('/') })))
      } catch {
        setError('Could not load this folder.')
      } finally {
        setLoading(false)
      }
    }

    fetchContainer()
  }, [currentUrl])

  function navigateTo(url, name) {
    setBreadcrumbs(prev => [...prev, { url, name }])
    setCurrentUrl(url)
  }

  function navigateToBreadcrumb(index) {
    const crumb = breadcrumbs[index]
    setBreadcrumbs(prev => prev.slice(0, index + 1))
    setCurrentUrl(crumb.url)
  }

  function toggleSelect(url) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map(i => i.url)))
    }
  }

  async function handleLogout() {
    await logout({ logoutType: 'idp' })
  }

  if (!session.info.isLoggedIn) return <Navigate to="/" replace />

  const selectedFiles = [...selected].filter(u => !u.endsWith('/'))

  return (
    <div className="min-h-screen bg-lumon-bg text-lumon-fg flex flex-col">
      <header className="border-b border-lumon-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-lumon-fg">BiobankPODS</h1>
        <div className="flex items-center gap-4">
          {selectedFiles.length > 0 && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-lumon-accent px-4 py-2 text-sm font-semibold text-lumon-bg hover:bg-lumon-accent-hover transition-colors"
            >
              <ShareIcon />
              Send copy ({selectedFiles.length})
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-lumon-subtle hover:text-lumon-fg transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 max-w-3xl w-full mx-auto">
        <nav className="flex items-center gap-1 text-sm mb-6 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.url} className="flex items-center gap-1">
              {i > 0 && <span className="text-lumon-border">/</span>}
              {i < breadcrumbs.length - 1 ? (
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className="text-lumon-accent hover:text-lumon-accent-hover transition-colors"
                >
                  {crumb.name}
                </button>
              ) : (
                <span className="text-lumon-fg">{crumb.name}</span>
              )}
            </span>
          ))}
        </nav>

        {loading && <p className="text-lumon-subtle">Loading…</p>}
        {error && <p className="text-lumon-error">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="text-lumon-subtle">This folder is empty.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="divide-y divide-lumon-border rounded-lg border border-lumon-border overflow-hidden">
            <li className="flex items-center gap-3 px-4 py-2 bg-lumon-surface">
              <input
                type="checkbox"
                checked={selected.size === items.length}
                onChange={toggleSelectAll}
                className="accent-lumon-accent w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-lumon-subtle">
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </span>
            </li>

            {items.map(item => (
              <li
                key={item.url}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${selected.has(item.url) ? 'bg-lumon-surface' : 'hover:bg-lumon-surface/50'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.url)}
                  onChange={() => toggleSelect(item.url)}
                  className="accent-lumon-accent w-4 h-4 cursor-pointer shrink-0"
                />
                {item.isContainer ? (
                  <button
                    onClick={() => navigateTo(item.url, itemName(item.url))}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <FolderIcon />
                    <span className="text-lumon-fg">{itemName(item.url)}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <FileIcon />
                    <span className="text-lumon-subtle">{itemName(item.url)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      {shareOpen && (
        <ShareModal
          selected={selected}
          sessionFetch={session.fetch}
          onClose={() => {
            setShareOpen(false)
            setSelected(new Set())
          }}
        />
      )}
    </div>
  )
}

function FolderIcon() {
  return (
    <svg className="w-5 h-5 text-lumon-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg className="w-5 h-5 text-lumon-subtle shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  )
}

export default FileBrowser
