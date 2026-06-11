import type { ServerResponse } from 'node:http'
import { sendJson, type ApiRequest } from './_lib/http.js'
import { isPrivyProvisioningConfigured } from './_lib/privy.js'

export default function handler(_req: ApiRequest, res: ServerResponse): void {
  sendJson(res, 200, {
    ok: true,
    phase: 'phase-1',
    cliMode: 'local_wallet_generation',
    provisioningConfigured: isPrivyProvisioningConfigured(),
    nextStep: 'phase-2-cli-integration',
  })
}
