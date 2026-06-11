import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ApiRequest extends IncomingMessage {
  body?: unknown
}

export function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body, null, 2))
}

export async function readJsonBody(req: ApiRequest): Promise<unknown> {
  if (req.body !== undefined) return parseJsonLike(req.body)

  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (chunks.length === 0) return {}

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? parseJsonLike(raw) : {}
}

function parseJsonLike(input: unknown): unknown {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    return trimmed ? JSON.parse(trimmed) : {}
  }

  if (Buffer.isBuffer(input)) {
    const trimmed = input.toString('utf8').trim()
    return trimmed ? JSON.parse(trimmed) : {}
  }

  return input
}
