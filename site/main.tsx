import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  WalletCards,
} from 'lucide-react'

import { Badge } from './components/ui/badge'
import { Button, buttonVariants } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { cn } from './lib/utils'

type HealthState = 'loading' | 'configured' | 'missing' | 'unavailable'

const envVars = [
  {
    name: 'PRIVY_APP_ID',
    description: 'Your Privy app identifier for the hosted provisioning app.',
  },
  {
    name: 'PRIVY_APP_SECRET',
    description: 'App secret used for authenticated Privy server requests.',
  },
  {
    name: 'PRIVY_API_BASE_URL',
    description: 'Optional override. Defaults to the Privy production API.',
  },
  {
    name: 'PRIVY_AUTHORIZATION_KEY_PUBLIC_KEY',
    description: 'Optional override. If omitted, the API derives the owner public key from the authorization private key.',
  },
  {
    name: 'PRIVY_AUTHORIZATION_PRIVATE_KEY',
    description: 'Required. Accepts Privy dashboard `wallet-auth:...`, PKCS#8 PEM, or raw base64 PKCS#8 DER.',
  },
]

const flowSteps = [
  {
    title: 'Create a wallet on demand',
    description: 'The API provisions a fresh Ethereum wallet through your Privy app.',
  },
  {
    title: 'Export once and return custody',
    description: 'The server exports the private key once and returns it in the response payload.',
  },
  {
    title: 'Avoid long-term management',
    description: 'The service is not intended to retain or manage caller wallets after provisioning.',
  },
]

const responseExample = `{
  "walletId": "wallet_123",
  "address": "0xabc...",
  "privateKey": "0xdef...",
  "chainType": "ethereum",
  "warning": "Store this private key securely. It will not be shown again."
}`

const cliExample = `npx create-mpp-app my-api

# current repo-local development
npm install
npm run dev -- my-api`

const healthCopy: Record<HealthState, { label: string; detail: string; tone: string }> = {
  loading: {
    label: 'Checking API',
    detail: 'Verifying whether Privy provisioning env vars are present.',
    tone: 'bg-secondary text-secondary-foreground',
  },
  configured: {
    label: 'Configured',
    detail: 'The hosted flow has the env vars it needs to create and export wallets.',
    tone: 'bg-emerald-100 text-emerald-900',
  },
  missing: {
    label: 'Missing env vars',
    detail: 'Deployment is live, but provisioning is blocked until Privy secrets are configured.',
    tone: 'bg-amber-100 text-amber-900',
  },
  unavailable: {
    label: 'Unavailable',
    detail: 'The health endpoint could not be reached from this page.',
    tone: 'bg-rose-100 text-rose-900',
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

function CodeBlock({ children }: { children: string }): React.JSX.Element {
  return (
    <pre className="overflow-x-auto rounded-[1.35rem] border border-border/50 bg-slate-950 px-4 py-4 text-sm leading-6 text-slate-100 md:px-5">
      <code className="font-mono">{children}</code>
    </pre>
  )
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}): React.JSX.Element {
  return (
    <div className="rounded-[1.4rem] border border-border/60 bg-background/72 p-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}

function App(): React.JSX.Element {
  const [health, setHealth] = useState<HealthState>('loading')
  const [copied, setCopied] = useState(false)

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
    if (!copied) return

    const timeout = window.setTimeout(() => {
      setCopied(false)
    }, 1800)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [copied])

  const origin = window.location.origin
  const curlExample = buildCurl(origin)
  const currentHealth = healthCopy[health]

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(curlExample)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(208,117,67,0.22),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(31,94,88,0.18),transparent_28%),linear-gradient(180deg,rgba(249,247,243,1),rgba(241,236,229,1))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.7),transparent)]" />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,rgba(230,170,122,0.34),transparent_70%)]" />
            <CardHeader className="relative gap-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="bg-accent/80 text-accent-foreground">
                  Phase 1 hosted onboarding
                </Badge>
                <Badge variant="outline">Privy-backed provisioning</Badge>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl font-serif text-4xl leading-none tracking-tight md:text-6xl">
                  Provision a wallet, hand off the key once, and get out of the way.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  This deployment is the hosted backend for the next version of{' '}
                  <span className="font-mono text-sm text-foreground">create-mpp-app</span>. It creates an
                  Ethereum wallet through Privy, exports the key one time, and returns custody to the caller
                  immediately.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Copied curl example' : 'Copy curl example'}
                </Button>
                <a className={buttonVariants({ variant: 'secondary' })} href="/api/health">
                  Open health endpoint
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </CardHeader>

            <CardContent className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="API status"
                value={currentHealth.label}
                detail={currentHealth.detail}
              />
              <MetricCard
                label="Current CLI mode"
                value="Local wallet generation"
                detail="The scaffold still creates wallets locally today. Phase 2 switches the CLI over to this hosted endpoint."
              />
              <MetricCard
                label="Custody model"
                value="One-time export"
                detail="Provisioning returns the private key to the caller and stops there. This service is not meant to be their wallet manager."
              />
            </CardContent>
          </Card>

          <Card className="bg-slate-950 text-slate-50">
            <CardHeader>
              <Badge className="w-fit bg-white/10 text-white" variant="secondary">
                Operating model
              </Badge>
              <CardTitle className="text-slate-50">You provision. They own.</CardTitle>
              <CardDescription className="text-slate-300">
                The product goal is simple: lower setup friction for developers who want a wallet fast without
                making this service responsible for their funds afterward.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {flowSteps.map((step, index) => (
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4" key={step.title}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-white/10 font-mono text-sm text-white">
                      {index + 1}
                    </div>
                    <p className="font-semibold text-white">{step.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{step.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-accent/80 p-3 text-accent-foreground">
                    <TerminalSquare className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">Provisioning API</CardTitle>
                    <CardDescription>
                      <span className="font-mono text-xs text-foreground">POST /api/provision</span> creates a
                      wallet and returns the one-time payload.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock>{curlExample}</CodeBlock>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Chain support: ethereum
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Input fields: projectName, name, email
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">Where the CLI fits</CardTitle>
                    <CardDescription>
                      The original CLI still lives in this repo. The next phase is swapping its local keygen
                      path for a call to this deployment.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CodeBlock>{cliExample}</CodeBlock>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/15 p-3 text-primary">
                    <WalletCards className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">One-time response</CardTitle>
                    <CardDescription>
                      Treat the response body as secret material. The private key should only be shown to the
                      caller over HTTPS and stored by them.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock>{responseExample}</CodeBlock>
                <div className="rounded-[1.3rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  This deployment is a provisioning surface, not a custody product. The secret key is meant to
                  leave this system immediately.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                    <KeyRound className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">Deployment env vars</CardTitle>
                    <CardDescription>
                      These need to be configured before the hosted provisioning path is usable.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {envVars.map((item) => (
                    <div className="rounded-[1.3rem] border border-border/60 bg-background/72 p-4" key={item.name}>
                      <p className="font-mono text-sm text-foreground">{item.name}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.3rem] border border-border/60 bg-background/72 p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
                        currentHealth.tone,
                      )}
                    >
                      {health === 'loading' ? (
                        <LoaderCircle className="mr-2 size-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="mr-2 size-3.5" />
                      )}
                      {currentHealth.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{currentHealth.detail}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}

const rootElement = document.getElementById('app')

if (!rootElement) {
  throw new Error('Expected #app root element to exist.')
}

createRoot(rootElement).render(<App />)
