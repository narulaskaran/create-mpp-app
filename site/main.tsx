import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Check, Copy, LoaderCircle } from 'lucide-react'

type HealthState = 'loading' | 'configured' | 'missing' | 'unavailable'

const commands = {
  clone: 'git clone https://github.com/narulaskaran/create-mpp-app.git',
  scaffold: 'cd create-mpp-app && npm install && npm run dev -- my-mpp-app',
  restart: 'cd my-mpp-app && npm run dev',
  test: 'npx mppx http://localhost:3000/paid',
}

const healthCopy: Record<HealthState, { label: string; detail: string; tone: string }> = {
  loading: {
    label: 'Checking hosted API',
    detail: 'Verifying whether the public wallet provisioning service is configured on this deployment.',
    tone: 'bg-zinc-100 text-zinc-600',
  },
  configured: {
    label: 'Hosted API configured',
    detail: 'This deployment is ready to provision wallets for the CLI.',
    tone: 'bg-emerald-100 text-emerald-800',
  },
  missing: {
    label: 'Hosted API not configured',
    detail: 'The site is live, but CLI wallet provisioning will fail until the service env vars are set.',
    tone: 'bg-amber-100 text-amber-800',
  },
  unavailable: {
    label: 'Hosted API unavailable',
    detail: 'The health endpoint could not be reached from this page.',
    tone: 'bg-rose-100 text-rose-800',
  },
}

function CommandButton({
  command,
  copied,
  onCopy,
  dark = true,
}: {
  command: string
  copied: boolean
  onCopy: () => void
  dark?: boolean
}): React.JSX.Element {
  return (
    <button
      className={
        dark
          ? 'w-full rounded-[1.25rem] px-4 py-3 text-left transition-colors hover:bg-white/5 active:bg-white/10'
          : 'w-full rounded-[1.25rem] px-4 py-3 text-left transition-colors hover:bg-zinc-100 active:bg-zinc-200'
      }
      onClick={onCopy}
      type="button"
    >
      <div className="flex items-center justify-between gap-4">
        <code className={dark ? 'min-w-0 truncate font-mono text-sm text-zinc-200' : 'min-w-0 truncate font-mono text-sm text-zinc-700'}>
          {command}
        </code>
        {copied ? (
          <Check className={dark ? 'size-4 shrink-0 text-emerald-300' : 'size-4 shrink-0 text-emerald-600'} />
        ) : (
          <Copy className={dark ? 'size-4 shrink-0 text-zinc-500' : 'size-4 shrink-0 text-zinc-400'} />
        )}
      </div>
    </button>
  )
}

function App(): React.JSX.Element {
  const [health, setHealth] = useState<HealthState>('loading')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/health')
      .then(async (response) => {
        if (!response.ok) throw new Error('health request failed')
        return (await response.json()) as { provisioningConfigured?: boolean }
      })
      .then((payload) => {
        if (cancelled) return
        setHealth(payload.provisioningConfigured ? 'configured' : 'missing')
      })
      .catch(() => {
        if (!cancelled) setHealth('unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!copiedId) return

    const timeout = window.setTimeout(() => {
      setCopiedId(null)
    }, 1800)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [copiedId])

  const currentHealth = healthCopy[health]

  async function handleCopy(id: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedId(id)
    } catch {
      setCopiedId(null)
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="relative flex min-h-screen flex-col overflow-auto">
        <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-5 md:px-8">
          <span className="text-base font-medium text-zinc-500">create-mpp-app</span>
          <a
            className="text-base text-zinc-500 transition-colors hover:text-zinc-800"
            href="https://github.com/narulaskaran/create-mpp-app"
            rel="noreferrer"
            target="_blank"
          >
            GitHub →
          </a>
        </header>

        <footer className="absolute bottom-0 left-0 right-0 flex items-center justify-center px-6 py-5 md:px-8">
          <p className="text-sm text-zinc-400">
            {currentHealth.label}.{' '}
            <a className="transition-colors hover:text-zinc-600" href="/api/health">
              Check /api/health
            </a>
          </p>
        </footer>

        <main className="flex flex-1 items-center justify-center px-6 pb-20 pt-24 md:px-8">
          <div className="w-full max-w-3xl space-y-10">
            <div className="space-y-4">
              <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${currentHealth.tone}`}>
                {health === 'loading' ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                CLI first
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 md:text-6xl">
                Spin up a new
                <br />
                <span className="text-emerald-600">MPP app.</span>
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-zinc-500">
                <span className="font-mono text-base text-zinc-700">create-mpp-app</span> scaffolds a small
                Next.js app with a paid <code>/paid</code> route, an env file, and the pieces you need to test
                Machine Payments Protocol locally.
              </p>

              <p className="max-w-2xl text-sm leading-7 text-zinc-400">
                The package is not published yet, so the current flow runs from this repo. The CLI provisions
                the wallet by calling this deployment, so users do not need their own Privy app or hosted API.
                It also boots the generated app for you after setup.
              </p>
            </div>

            <div className="space-y-4">
              <section className="space-y-2 rounded-[1.75rem] bg-zinc-50 p-5">
                <div className="px-1">
                  <p className="text-sm text-zinc-400">Set up from this repo</p>
                </div>
                <div className="space-y-1 rounded-[1.4rem] bg-zinc-900 px-4 py-3">
                  <CommandButton
                    command={commands.clone}
                    copied={copiedId === 'clone'}
                    onCopy={() => void handleCopy('clone', commands.clone)}
                  />
                  <CommandButton
                    command={commands.scaffold}
                    copied={copiedId === 'scaffold'}
                    onCopy={() => void handleCopy('scaffold', commands.scaffold)}
                  />
                </div>
              </section>

              <section className="space-y-2 rounded-[1.75rem] bg-zinc-50 p-5">
                <div className="px-1">
                  <p className="text-sm text-zinc-400">Then test it</p>
                </div>
                <div className="space-y-1 rounded-[1.4rem] bg-white px-4 py-3 ring-1 ring-zinc-200">
                  <CommandButton
                    command={commands.test}
                    copied={copiedId === 'test'}
                    dark={false}
                    onCopy={() => void handleCopy('test', commands.test)}
                  />
                  <CommandButton
                    command={commands.restart}
                    copied={copiedId === 'restart'}
                    dark={false}
                    onCopy={() => void handleCopy('restart', commands.restart)}
                  />
                </div>
                <p className="px-1 text-sm leading-7 text-zinc-400">
                  The CLI starts the dev server automatically. Use the second command if you stop it and want to
                  boot it again later.
                </p>
              </section>

              <section className="space-y-3 rounded-[1.75rem] bg-zinc-50 p-5">
                <div className="px-1">
                  <p className="text-sm text-zinc-400">What it scaffolds</p>
                </div>
                <div className="space-y-3 px-1 text-sm leading-7 text-zinc-500">
                  <p>A Next.js App Router starter.</p>
                  <p>A paid <code className="text-zinc-700">GET /paid</code> route backed by <code className="text-zinc-700">mppx/server</code>.</p>
                  <p>
                    <code className="text-zinc-700">.env.local</code>, <code className="text-zinc-700">.env.example</code>,
                    and a wallet provisioned once through the public service.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

const rootElement = document.getElementById('app')

if (!rootElement) {
  throw new Error('Expected #app root element to exist.')
}

createRoot(rootElement).render(<App />)
