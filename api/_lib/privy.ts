import { Chacha20Poly1305 } from '@hpke/chacha20poly1305'
import { CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from '@hpke/core'
import canonicalize from 'canonicalize'
import { createPrivateKey, createSign, type KeyObject } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_PRIVY_API_BASE_URL = 'https://api.privy.io/v1'
const DEFAULT_PRIVY_AUTHORIZATION_PRIVATE_KEY_PATH = '.privy/authorization-private.pem'
const PRIVATE_KEY_WARNING = 'Store this private key securely. It will not be shown again.'
const PRIVY_AUTHORIZATION_REQUEST_TTL_MS = 5 * 60 * 1000

type WritablePrivyMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface CreateWalletResponse {
  id: string
  address: string
  chain_type: string
}

interface ExportWalletResponse {
  ciphertext: string
  encapsulated_key: string
  encryption_type: string
}

export interface ProvisioningRequest {
  chainType: 'ethereum'
  email?: string
  name?: string
  projectName?: string
}

export interface ProvisionedWallet {
  address: string
  chainType: string
  privateKey: string
  walletId: string
  warning: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let cachedAuthorizationPrivateKey: KeyObject | undefined

export function parseProvisioningRequest(body: unknown): ProvisioningRequest {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('Request body must be a JSON object.', 400, 'invalid_request')
  }

  const candidate = body as Record<string, unknown>
  const chainType = candidate.chainType ?? 'ethereum'

  if (chainType !== 'ethereum') {
    throw new ApiError('Only chainType="ethereum" is supported in the current demo.', 400, 'unsupported_chain')
  }

  return {
    chainType,
    email: optionalString(candidate.email, 'email'),
    name: optionalString(candidate.name, 'name'),
    projectName: optionalString(candidate.projectName, 'projectName'),
  }
}

export function isPrivyProvisioningConfigured(): boolean {
  return (
    hasEnv('PRIVY_APP_ID') &&
    hasEnv('PRIVY_APP_SECRET') &&
    hasEnv('PRIVY_AUTHORIZATION_KEY_PUBLIC_KEY') &&
    hasPrivyAuthorizationPrivateKey()
  )
}

export async function provisionPrivyWallet(input: ProvisioningRequest): Promise<ProvisionedWallet> {
  const wallet = await createWallet(input.chainType)
  const privateKey = await exportWalletPrivateKey(wallet.id)

  return {
    walletId: wallet.id,
    address: wallet.address,
    privateKey,
    chainType: wallet.chain_type,
    warning: PRIVATE_KEY_WARNING,
  }
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new ApiError(`${fieldName} must be a string when provided.`, 400, 'invalid_request')
  }
  return value
}

async function createWallet(chainType: 'ethereum'): Promise<CreateWalletResponse> {
  const ownerPublicKey = requireEnv('PRIVY_AUTHORIZATION_KEY_PUBLIC_KEY')
  const body: Record<string, unknown> = {
    chain_type: chainType,
    owner: { public_key: ownerPublicKey },
  }

  return privyFetch<CreateWalletResponse>('/wallets', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function exportWalletPrivateKey(walletId: string): Promise<string> {
  const suite = new CipherSuite({
    kem: new DhkemP256HkdfSha256(),
    kdf: new HkdfSha256(),
    aead: new Chacha20Poly1305(),
  })

  const recipientKeyPair = await suite.kem.generateKeyPair()
  const exportedPublicKey = await getWebCrypto().subtle.exportKey('spki', recipientKeyPair.publicKey)
  const exportBody = {
    encryption_type: 'HPKE',
    recipient_public_key: toBase64(exportedPublicKey),
  }
  const exportResponse = await privyFetch<ExportWalletResponse>(`/wallets/${walletId}/export`, {
    method: 'POST',
    body: JSON.stringify(exportBody),
    headers: createPrivyAuthorizationHeaders({
      method: 'POST',
      path: `/wallets/${walletId}/export`,
      body: exportBody,
    }),
  })

  if (exportResponse.encryption_type !== 'HPKE') {
    throw new ApiError('Privy returned an unsupported wallet export payload.', 502, 'privy_export_failed')
  }

  const recipientContext = await suite.createRecipientContext({
    recipientKey: recipientKeyPair.privateKey,
    enc: fromBase64(exportResponse.encapsulated_key),
  })

  const plaintext = await recipientContext.open(fromBase64(exportResponse.ciphertext))
  return new TextDecoder().decode(plaintext).trim()
}

async function privyFetch<T>(path: string, init: RequestInit): Promise<T> {
  const appId = requireEnv('PRIVY_APP_ID')
  const appSecret = requireEnv('PRIVY_APP_SECRET')
  const response = await fetch(`${privyApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`,
      'content-type': 'application/json',
      'privy-app-id': appId,
      ...init.headers,
    },
  })

  const raw = await response.text()
  const payload = raw ? safeJsonParse(raw) : undefined

  if (!response.ok) {
    const upstreamMessage = readUpstreamMessage(payload)
    throw new ApiError(
      upstreamMessage ?? `Privy request failed with status ${response.status}.`,
      response.status >= 400 && response.status < 500 ? response.status : 502,
      'privy_request_failed',
    )
  }

  if (payload === undefined) {
    throw new ApiError('Privy returned an empty response.', 502, 'privy_request_failed')
  }

  return payload as T
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new ApiError(`${name} is not configured.`, 500, 'configuration_error')
  return value
}

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

function privyApiBaseUrl(): string {
  return (process.env.PRIVY_API_BASE_URL?.trim() || DEFAULT_PRIVY_API_BASE_URL).replace(/\/+$/, '')
}

function createPrivyAuthorizationHeaders(input: {
  method: WritablePrivyMethod
  path: string
  body: unknown
  idempotencyKey?: string
}): Record<string, string> {
  const appId = requireEnv('PRIVY_APP_ID')
  const expiry = String(Date.now() + PRIVY_AUTHORIZATION_REQUEST_TTL_MS)
  const signedHeaders: Record<string, string> = {
    'privy-app-id': appId,
    'privy-request-expiry': expiry,
  }

  if (input.idempotencyKey) {
    signedHeaders['privy-idempotency-key'] = input.idempotencyKey
  }

  const payload = canonicalize({
    version: 1,
    method: input.method,
    url: `${privyApiBaseUrl()}${input.path}`,
    body: input.body,
    headers: signedHeaders,
  })

  if (!payload) {
    throw new ApiError('Failed to canonicalize the Privy authorization payload.', 500, 'runtime_error')
  }

  const signer = createSign('sha256')
  signer.update(payload)
  signer.end()

  return {
    'privy-authorization-signature': signer.sign(loadPrivyAuthorizationPrivateKey()).toString('base64'),
    'privy-request-expiry': expiry,
  }
}

function loadPrivyAuthorizationPrivateKey(): KeyObject {
  if (cachedAuthorizationPrivateKey) return cachedAuthorizationPrivateKey

  const configuredKey = process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY?.trim()
  if (configuredKey) {
    cachedAuthorizationPrivateKey = createAuthorizationPrivateKey(configuredKey, 'PRIVY_AUTHORIZATION_PRIVATE_KEY')
    return cachedAuthorizationPrivateKey
  }

  const localPath = defaultPrivyAuthorizationPrivateKeyPath()
  try {
    cachedAuthorizationPrivateKey = createAuthorizationPrivateKey(readFileSync(localPath, 'utf8'), localPath)
    return cachedAuthorizationPrivateKey
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(
      `PRIVY_AUTHORIZATION_PRIVATE_KEY is not configured and ${localPath} is missing.`,
      500,
      'configuration_error',
    )
  }
}

function createAuthorizationPrivateKey(value: string, sourceName: string): KeyObject {
  const normalized = value.replace(/\\n/g, '\n').trim()

  try {
    return createPrivateKey(normalized)
  } catch {
    try {
      return createPrivateKey({
        key: Buffer.from(normalized.replace(/\s+/g, ''), 'base64'),
        format: 'der',
        type: 'pkcs8',
      })
    } catch {
      throw new ApiError(`${sourceName} is not a valid PKCS#8 P-256 private key.`, 500, 'configuration_error')
    }
  }
}

function hasPrivyAuthorizationPrivateKey(): boolean {
  return hasEnv('PRIVY_AUTHORIZATION_PRIVATE_KEY') || existsSync(defaultPrivyAuthorizationPrivateKeyPath())
}

function defaultPrivyAuthorizationPrivateKeyPath(): string {
  return resolve(process.cwd(), DEFAULT_PRIVY_AUTHORIZATION_PRIVATE_KEY_PATH)
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return { message: raw }
  }
}

function readUpstreamMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined

  const candidate = payload as Record<string, unknown>
  const message = candidate.message ?? candidate.error ?? candidate.detail
  return typeof message === 'string' && message.trim() ? message : undefined
}

function getWebCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new ApiError('Web Crypto is unavailable in this runtime.', 500, 'runtime_error')
  }

  return globalThis.crypto
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'))
}

function toBase64(value: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(value)).toString('base64')
}
