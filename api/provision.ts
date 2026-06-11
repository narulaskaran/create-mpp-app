import type { ServerResponse } from 'node:http'
import { readJsonBody, sendJson, type ApiRequest } from './_lib/http.js'
import { ApiError, parseProvisioningRequest, provisionPrivyWallet } from './_lib/privy.js'

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  if (req.method === 'GET') {
    sendJson(res, 200, {
      endpoint: '/api/provision',
      method: 'POST',
      body: {
        projectName: 'my-api',
        name: 'Demo Developer',
        email: 'demo@example.com',
        chainType: 'ethereum',
      },
      returns: {
        walletId: 'wallet_123',
        address: '0xabc...',
        privateKey: '0xdef...',
        chainType: 'ethereum',
        warning: 'Store this private key securely. It will not be shown again.',
      },
    })
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('allow', 'GET, POST')
    sendJson(res, 405, { error: 'method_not_allowed', message: 'Use GET for docs or POST to provision a wallet.' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const input = parseProvisioningRequest(body)
    const wallet = await provisionPrivyWallet(input)

    sendJson(res, 200, wallet)
  } catch (error) {
    const failure = normalizeError(error)
    sendJson(res, failure.statusCode, {
      error: failure.code,
      message: failure.message,
    })
  }
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof SyntaxError) return new ApiError('Request body must contain valid JSON.', 400, 'invalid_json')
  return new ApiError('Unexpected provisioning failure.', 500, 'internal_error')
}
