import crypto from 'crypto'

const DEFAULT_PROVISION_URL = 'https://create-mpp-app.vercel.app/api/provision'

export interface Wallet {
  address: `0x${string}`
  privateKey: `0x${string}`
  secretKey: string
}

export async function provisionWallet(projectName: string): Promise<Wallet> {
  const response = await fetch(resolveProvisionUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      projectName,
      chainType: 'ethereum',
    }),
  })

  const payload = await readPayload(response)
  if (!response.ok) {
    throw new Error(readErrorMessage(payload) ?? `Wallet provisioning failed with status ${response.status}.`)
  }

  return {
    address: normalizeAddress(payload),
    privateKey: normalizePrivateKey(payload),
    secretKey: crypto.randomBytes(32).toString('base64'),
  }
}

function resolveProvisionUrl(): string {
  return process.env.CREATE_MPP_APP_PROVISION_URL?.trim() || DEFAULT_PROVISION_URL
}

async function readPayload(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw) return undefined

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function normalizeAddress(payload: unknown): `0x${string}` {
  const address = readStringField(payload, 'address')
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error('Provisioning service returned an invalid wallet address.')
  }
  return address as `0x${string}`
}

function normalizePrivateKey(payload: unknown): `0x${string}` {
  const privateKey = readStringField(payload, 'privateKey')
  const normalized = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`

  if (!/^0x[a-fA-F0-9]{64}$/.test(normalized)) {
    throw new Error('Provisioning service returned an invalid private key.')
  }

  return normalized as `0x${string}`
}

function readStringField(payload: unknown, field: string): string {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Provisioning service returned an invalid response body. Missing ${field}.`)
  }

  const value = (payload as Record<string, unknown>)[field]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Provisioning service returned an invalid ${field}.`)
  }

  return value.trim()
}

function readErrorMessage(payload: unknown): string | undefined {
  if (typeof payload === 'string') {
    return payload.trim() || undefined
  }

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined
  }

  const candidate = payload as Record<string, unknown>
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message.trim()
  }

  if (typeof candidate.error === 'string' && candidate.error.trim()) {
    return candidate.error.trim()
  }

  return undefined
}
