# create-mpp-app

Bootstrap a small Next.js app that accepts Machine Payments Protocol payments.

`create-mpp-app` currently runs from this repo and scaffolds:

- a Next.js App Router app
- a paid `GET /paid` route powered by `mppx/server`
- `.env.local` and `.env.example`
- a locally generated wallet and MPP secret for testing

## Quickstart

The package is not published yet, so the current flow is repo-local:

```bash
git clone https://github.com/narulaskaran/create-mpp-app.git
cd create-mpp-app
npm install
npm run dev -- my-mpp-app
```

Then start the generated app:

```bash
cd my-mpp-app
npm run dev
```

Test the paid route:

```bash
npx mppx http://localhost:3000/paid
```

## CLI flags

- `--price=<n>` sets the payment amount. Default: `0.01`
- `--testnet` uses Tempo testnet. Default: on
- `--mainnet` uses Tempo mainnet
- `--yes` or `-y` skips prompts

## What lives here

- [`src/`](./src): the CLI and scaffold templates
- [`site/`](./site): the public landing page for the project
- [`api/`](./api): an optional hosted Privy-backed provisioning API

The hosted API is a separate surface from the CLI today. The CLI still generates a wallet locally and does not yet call the deployed provisioning endpoint.

## Hosted provisioning API

If you deploy this repo to Vercel, it also serves the landing page and `api/` routes together. The provisioning API lives at `POST /api/provision`.

Configure the required env vars in [.env.example](./.env.example) if you want that hosted flow. The repo accepts Privy dashboard authorization keys in the `wallet-auth:...` format.

## Development

```bash
npm run check
```

`npm run check` builds the CLI and site, then typechecks the repo.
