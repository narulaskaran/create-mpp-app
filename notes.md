# Notes

## Current State

- `README.md` now describes a Privy-backed wallet flow and says the scaffold writes `.env`.
- The current implementation still does local wallet generation with `viem` in `src/wallet.ts`.
- The current scaffold writes `.env.local` and includes `TEMPO_RECIPIENT_KEY`.
- The generated server route does not use `TEMPO_RECIPIENT_KEY`; it only needs:
  - `TEMPO_RECIPIENT`
  - `TEMPO_CURRENCY`
  - `TEMPO_TESTNET`
  - `MPP_SECRET_KEY`
  - `PAYMENT_AMOUNT`

## Gap To Close

- The wallet model is now decided.
- This repo should implement a Stripe-owned Privy app that exposes a public provisioning endpoint.
- The endpoint can collect minimal personal information, create a Tempo-compatible EVM wallet, export the private key once, and return:
  - wallet address
  - private key
- The service should not persist user private keys after responding.
- The service should not manage the wallet after provisioning; once the caller receives the key, custody is theirs.

## Working Implementation Plan

- Add a wallet provider layer instead of hardcoding local `viem` keygen.
- Add a Privy-backed provider using `@privy-io/node`.
- Resolve `PRIVY_APP_ID` and `PRIVY_APP_SECRET` from environment variables or interactive prompts.
- Create an app-owned wallet with `chain_type: 'ethereum'`.
- Ensure the wallet has an owner so server-side export is allowed.
- Write `.env` instead of `.env.local`.
- Store:
  - `TEMPO_RECIPIENT`
  - `TEMPO_CURRENCY`
  - `TEMPO_TESTNET`
  - `MPP_SECRET_KEY`
  - `PAYMENT_AMOUNT`
- Likely remove `TEMPO_RECIPIENT_KEY` from the generated app unless we intentionally want the scaffold to retain the recipient private key locally.
- Avoid retaining `PRIVY_WALLET_ID` unless it is operationally necessary for debugging.
- Add safeguards around public provisioning:
  - rate limiting
  - minimal request validation
  - no secret-key logging
- Update CLI success text and scaffold docs after the wallet model is settled.

## Questions For Privy

1. For an app-owned provisioning service, is `chain_type: 'ethereum'` the correct and sufficient configuration for Tempo?
2. What is the simplest supported owner configuration for create-once, export-once, then hand off custody?
3. Is the REST export flow with basic app auth and an owned wallet the correct implementation for this use case?
4. Are there best practices for idempotency, naming, cleanup, or rate limits when creating wallets from a public endpoint?
5. Are there Tempo-specific caveats for funding, withdrawals, or gas sponsorship on wallets created this way?
6. Is `@privy-io/node` still the preferred package for this server-side provisioning flow?

## Decision Log

- Chosen direction: Stripe owns the Privy app and runs a public wallet-provisioning endpoint.
- The service creates a wallet, exports the private key once, and returns it to the caller.
- The service should not store user secret keys after the response is sent.
- The service should not be responsible for managing wallets after provisioning.
- This is a managed-app provisioning service, not a developer-owned Privy-account flow.
- Exact current Privy contract:
  - create the wallet with `owner.public_key = PRIVY_AUTHORIZATION_KEY_PUBLIC_KEY`
  - export the wallet with Basic app auth plus `privy-request-expiry` and `privy-authorization-signature`
  - sign the export request with the matching authorization private key over the RFC 8785 canonical payload
- Required credentials for the current flow:
  - `PRIVY_APP_ID`
  - `PRIVY_APP_SECRET`
  - `PRIVY_AUTHORIZATION_KEY_PUBLIC_KEY`
  - `PRIVY_AUTHORIZATION_PRIVATE_KEY` in production, or local fallback at `.privy/authorization-private.pem`

## Meeting Notes

- June 9 Privy sync narrowed the options to:
  - team-owned Privy app
  - developer-owned Privy accounts
- Agent Sandbox was explicitly discouraged.
- The current repo direction now aligns with the team-owned Privy app option.
- The open product work is post-provision experience and Stripe graduation, not wallet custody after issuance.

## After Meeting

- [x] Confirm wallet model
- [x] Confirm env contract at a high level
- [x] Confirm exact Privy owner/export configuration
- [x] Confirm required Privy credentials
- [x] Confirm SDK/package/API shape
- [ ] Implement CLI changes
- [x] Update README wording
