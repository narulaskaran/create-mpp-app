import crypto from 'crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

export interface Wallet {
  address: `0x${string}`
  privateKey: `0x${string}`
  secretKey: string
}

export function generateWallet(): Wallet {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  const secretKey = crypto.randomBytes(32).toString('base64')
  return { address: account.address, privateKey, secretKey }
}
