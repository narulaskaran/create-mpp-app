import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Check, Copy } from 'lucide-react'

const commands = {
  clone: 'git clone https://github.com/narulaskaran/create-mpp-app.git',
  scaffold: 'cd create-mpp-app && npm run dev -- my-mpp-app',
  restart: 'cd my-mpp-app && npm run dev',
  test: 'npx mppx http://localhost:3000/paid',
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
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!copiedId) return

    const timeout = window.setTimeout(() => {
      setCopiedId(null)
    }, 1800)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [copiedId])

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
        </header>

        <footer className="absolute bottom-0 left-0 right-0 flex items-center justify-center px-6 py-5 md:px-8">
          <a
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-600"
            href="https://github.com/narulaskaran/create-mpp-app"
            rel="noreferrer"
            target="_blank"
          >
            View on GitHub
          </a>
        </footer>

        <main className="flex flex-1 items-center justify-center px-6 pb-20 pt-24 md:px-8">
          <div className="w-full max-w-3xl space-y-10">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 md:text-6xl">
                Start accepting
                <br />
                Machine <span style={{ color: '#00A63A' }}>Payments</span>
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-zinc-500">
                Quickly scaffold a Next.js app with a <code>GET /paid</code> route which accepts machine
                payments.{' '}
                <a
                  className="text-zinc-400 underline underline-offset-4 transition-colors hover:text-zinc-600"
                  href="https://mpp.dev"
                  rel="noreferrer"
                  target="_blank"
                >
                  What is MPP?
                </a>
              </p>

              <p className="max-w-2xl text-sm leading-7 text-zinc-400">
                The CLI provisions a new EVM compatible wallet via Privy. It stores both the secret key and
                wallet address in your server&apos;s .env. We don&apos;t store these keys anywhere so keep them
                a safe place. The repo-local CLI runs from the prebuilt bundle, so you do not need a root
                install before first use.
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
                  <p className="text-sm text-zinc-400">
                    Then test it. If you stop the server, use the second command to boot it again.
                  </p>
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
