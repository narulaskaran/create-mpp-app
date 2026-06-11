import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Check, Copy, LoaderCircle } from 'lucide-react'

type HealthState = 'loading' | 'configured' | 'missing' | 'unavailable'

const responseExample = `{
  "walletId": "wallet_123",
  "address": "0xabc...",
  "privateKey": "0xdef...",
  "chainType": "ethereum",
  "warning": "Store this private key securely. It will not be shown again."
}`

const healthCopy: Record<HealthState, { label: string; detail: string; tone: string }> = {
  loading: {
    label: 'Checking configuration',
    detail: 'Verifying whether the deployment can provision wallets right now.',
    tone: 'bg-zinc-100 text-zinc-600',
  },
  configured: {
    label: 'Configured',
    detail: 'The hosted flow has what it needs to create and export wallets.',
    tone: 'bg-emerald-100 text-emerald-800',
  },
  missing: {
    label: 'Missing env vars',
    detail: 'Deployment is live, but provisioning is blocked until Privy secrets are configured.',
    tone: 'bg-amber-100 text-amber-800',
  },
  unavailable: {
    label: 'Unavailable',
    detail: 'The health endpoint could not be reached from this page.',
    tone: 'bg-rose-100 text-rose-800',
  },
}

function buildCurl(origin: string): string {
  return `curl --request POST \\
  --url ${origin}/api/provision \\
  --header 'content-type: application/json' \\
  --data '{
    "projectName": "my-api",
    "name": "Demo Developer",
    "email": "demo@example.com",
    "chainType": "ethereum"
  }'`
}

function buildHealthCommand(origin: string): string {
  return `curl ${origin}/api/health`
}

function CodeBlock({ children, tone = 'dark' }: { children: string; tone?: 'dark' | 'light' }): React.JSX.Element {
  return (
    <pre
      className={
        tone === 'dark'
          ? 'overflow-x-auto rounded-[1.5rem] bg-zinc-900 px-4 py-4 text-sm leading-6 text-zinc-100 md:px-5'
          : 'overflow-x-auto rounded-[1.5rem] bg-white px-4 py-4 text-sm leading-6 text-zinc-700 ring-1 ring-zinc-200 md:px-5'
      }
    >
      <code className="font-mono">{children}</code>
    </pre>
  )
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

  const origin = window.location.origin
  const curlExample = buildCurl(origin)
  const healthCommand = buildHealthCommand(origin)
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
          <a
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-600"
            href="/api/health"
          >
            Check /api/health
          </a>
        </footer>

        <main className="flex flex-1 items-center justify-center px-6 pb-20 pt-24 md:px-8">
          <div className="w-full max-w-3xl space-y-10">
            <div className="space-y-4">
              <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${currentHealth.tone}`}>
                {health === 'loading' ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                {currentHealth.label}
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 md:text-6xl">
                Create a wallet.
                <br />
                Return the key <span className="text-emerald-600">once.</span>
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-zinc-500">
                Hosted wallet provisioning for <span className="font-mono text-base text-zinc-700">create-mpp-app</span>.
                It creates a Privy wallet, exports the private key one time, and hands custody back to the caller.
              </p>

              <p className="max-w-2xl text-sm leading-7 text-zinc-400">
                {currentHealth.detail} Set <code>PRIVY_APP_ID</code>, <code>PRIVY_APP_SECRET</code>, and{' '}
                <code>PRIVY_AUTHORIZATION_PRIVATE_KEY</code> in Vercel. The public key is optional.
              </p>
            </div>

            <div className="space-y-4">
              <section className="space-y-2 rounded-[1.75rem] bg-zinc-50 p-5">
                <div className="px-1">
                  <p className="text-sm text-zinc-400">Provision via API</p>
                </div>
                <div className="space-y-1 rounded-[1.4rem] bg-zinc-900 px-4 py-3">
                  <CommandButton
                    command={curlExample}
                    copied={copiedId === 'curl'}
                    onCopy={() => void handleCopy('curl', curlExample)}
                  />
                  <CommandButton
                    command={healthCommand}
                    copied={copiedId === 'health'}
                    onCopy={() => void handleCopy('health', healthCommand)}
                  />
                </div>
              </section>

              <section className="space-y-2 rounded-[1.75rem] bg-zinc-50 p-5">
                <div className="px-1">
                  <p className="text-sm text-zinc-400">One-time response</p>
                </div>
                <CodeBlock tone="light">{responseExample}</CodeBlock>
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
