# create-mpp-app

Bootstrap a small Next.js app that accepts Machine Payments Protocol payments.

`create-mpp-app` currently runs from this repo and scaffolds:

- a Next.js App Router app
- a paid `GET /paid` route powered by `mppx/server`
- `.env.local` and `.env.example`
- a wallet provisioned through `https://create-mpp-app.vercel.app/api/provision`
- a local `MPP_SECRET_KEY` for the generated route

## Quickstart

The package is not published yet, so the current flow is repo-local:

```bash
git clone https://github.com/narulaskaran/create-mpp-app.git
cd create-mpp-app
npm run dev -- my-mpp-app
```

The CLI provisions a wallet by calling the public `create-mpp-app.vercel.app` deployment. Users of the CLI do not need their own Privy app, Vercel project, or provisioning API.
It also installs dependencies and starts the generated app's dev server automatically.
The repo-local `npm run dev` entrypoint intentionally runs the prebuilt CLI bundle in `dist/`, so a fresh clone does not need a root `npm install` before first run.

Once the package is published, the intended entrypoint is `npx create-mpp-app my-mpp-app`.

If you stop the server later, start it again with:

```bash
cd my-mpp-app
npm run dev
```

When the server starts, the CLI prints the exact `tempo request http://localhost:<port>/paid` command for the chosen port.

## CLI flags

- `--price=<n>` sets the payment amount. Default: `0.01`
- `--testnet` uses Tempo testnet. Default: on
- `--mainnet` uses Tempo mainnet
- `--yes` or `-y` skips prompts
- `--no-dev` skips automatically starting the generated app

## What lives here

- [`src/`](./src): the CLI and scaffold templates
- [`site/`](./site): the public landing page for the project
- [`api/`](./api): the hosted Privy-backed provisioning API the CLI calls by default

Most users only need the CLI. The `api/` folder exists here because this repo also contains the public provisioning service behind it.

## Maintaining The Provisioning Service

The public provisioning API lives at `POST /api/provision`. Maintainers can run or deploy this repo with the env vars in [.env.example](./.env.example).

Notes:

- `PRIVY_AUTHORIZATION_PRIVATE_KEY` accepts the Privy dashboard `wallet-auth:...` format.
- `PRIVY_AUTHORIZATION_KEY_PUBLIC_KEY` is optional if the private key is present.
- `CREATE_MPP_APP_PROVISION_URL` can override the default provisioning endpoint when developing the CLI against a different deployment.

## Development

If you are working on this repo itself, install the repo dependencies first:

```bash
npm install
```

Then use the maintainer commands below.

## Maintainer Checks

```bash
npm run check
```

`npm run check` builds the CLI and site, then typechecks the repo.
GitHub Actions also verifies that `dist/` is up to date on pull requests and auto-refreshes it on new commits to `main`.

If you are changing the CLI itself and want to run it from source, use:

```bash
npm run dev:source -- my-mpp-app
```
