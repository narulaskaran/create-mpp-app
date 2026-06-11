# create-mpp-app

This repo now carries both halves of the demo:

- the existing `create-mpp-app` CLI in [`src/`](./src)
- the Phase 1 Privy-backed wallet provisioning surface for Vercel in [`api/`](./api)

## Current status

- Phase 1 is here: a deployable provisioning API plus a minimal landing page for the hosted flow.
- Phase 2 is still pending: the CLI in `src/` still generates wallets locally and does not call the hosted API yet.

## CLI

The CLI can be used interactively or non-interactively.

**Interactive**

```bash
npx create-mpp-app my-api
```

**Non-interactive**

```bash
npx create-mpp-app my-api --price=0.01 --mainnet --yes
```

**Flags**

| Flag | Default | Description |
|------|---------|-------------|
| `--price=<n>` | `0.01` | API price |
| `--testnet` | ✓ | Use Tempo testnet |
| `--mainnet` | — | Use Tempo mainnet |
| `--yes` / `-y` | — | Skip prompts |

### Local CLI development

```bash
npm install
npm run build
npm run dev -- my-api
```

## Phase 1 provisioning API

Deploy this repo to Vercel and configure the env vars in [.env.example](./.env.example).
`npm run build` now emits both the CLI bundle in `dist/` and the landing page assets in `public/`, which matches the Vercel deployment.

This implementation currently follows the managed-app/server-export path:

- the server creates the wallet
- the server signs the export request with the app authorization key
- the server exports the private key once
- the server returns the key to the caller
- the service does not retain the user secret key after responding
- the service is not intended to manage the wallet after provisioning

This is intentionally a one-time provisioning service. The app owns the Privy integration, but the caller is expected to take custody of the exported private key and manage the wallet outside this service after creation.

### Endpoint

`POST /api/provision`

Request body:

```json
{
  "projectName": "my-api",
  "name": "Demo Developer",
  "email": "demo@example.com",
  "chainType": "ethereum"
}
```

Response body:

```json
{
  "walletId": "wallet_123",
  "address": "0xabc...",
  "privateKey": "0xdef...",
  "chainType": "ethereum",
  "warning": "Store this private key securely. It will not be shown again."
}
```

The response should be treated as secret material:

- do not log `privateKey`
- do not persist `privateKey` server-side
- deliver it only over HTTPS
- expect the caller to store it themselves

### Vercel env vars

- `PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `PRIVY_API_BASE_URL` (optional, defaults to `https://api.privy.io/v1`)
- `PRIVY_AUTHORIZATION_KEY_PUBLIC_KEY` (required for the current export flow; use the real P-256 public key, preferably as single-line base64-DER, not a dashboard ID)
- `PRIVY_AUTHORIZATION_PRIVATE_KEY` (required in Vercel to sign export requests; use the matching PKCS#8 PEM private key with `\n` escapes)

For local development, if `PRIVY_AUTHORIZATION_PRIVATE_KEY` is unset, the API falls back to `.privy/authorization-private.pem`.

## Landing page

The root landing page is generated into `public/` during the build from [`index.html`](./index.html) plus the React/Tailwind source in [`site/`](./site). Vercel serves that static output alongside the `api/` functions. It explains:

- what this deployment does
- how the CLI fits into the flow
- how to call the provisioning API

## Verification

```bash
npm run check
```

`npm run check` validates the CLI build and typechecks the added Vercel API code.
