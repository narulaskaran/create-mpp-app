import * as p from '@clack/prompts'
import { execSync, spawn } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import pc from 'picocolors'
import { scaffold } from './scaffold.js'
import { provisionWallet } from './wallet.js'

interface Flags {
  yes: boolean
  price: string
  startDev: boolean
  testnet: boolean
}

function parseArgs(): { projectName: string | undefined; flags: Flags } {
  const args = process.argv.slice(2)
  const flags: Flags = { yes: false, price: '0.01', startDev: true, testnet: true }
  let projectName: string | undefined

  for (const arg of args) {
    if (arg === '--yes' || arg === '-y') flags.yes = true
    else if (arg === '--no-dev') flags.startDev = false
    else if (arg === '--mainnet') flags.testnet = false
    else if (arg === '--testnet') flags.testnet = true
    else if (arg.startsWith('--price=')) flags.price = arg.slice('--price='.length)
    else if (!arg.startsWith('-')) projectName = arg
  }

  return { projectName, flags }
}

async function main() {
  const { projectName: argName, flags } = parseArgs()
  const nonInteractive = flags.yes || !process.stdout.isTTY

  if (!nonInteractive) {
    console.log()
    p.intro(pc.bgCyan(pc.black(' create-mpp-app ')))
  }

  let projectName: string
  let price: string
  let testnet: boolean

  if (nonInteractive) {
    if (!argName) {
      console.error('Error: project name required in non-interactive mode\nUsage: create-mpp-app <name> [--price=0.01] [--testnet|--mainnet] [--yes] [--no-dev]')
      process.exit(1)
    }
    projectName = argName
    price = flags.price
    testnet = flags.testnet
  } else {
    const nameResult = argName ?? await p.text({
      message: 'Project name?',
      placeholder: 'my-mpp-api',
      validate: (v) => (!v ? 'Required' : undefined),
    })
    if (p.isCancel(nameResult)) { p.cancel('Cancelled'); process.exit(0) }
    projectName = nameResult as string

    const priceResult = await p.text({
      message: 'Price per call (USDC)?',
      placeholder: '0.01',
      initialValue: '0.01',
      validate: (v) => (isNaN(Number(v)) || Number(v) <= 0 ? 'Must be a positive number' : undefined),
    })
    if (p.isCancel(priceResult)) { p.cancel('Cancelled'); process.exit(0) }
    price = priceResult as string

    const testnetResult = await p.confirm({
      message: 'Use testnet (Tempo Moderato)?',
      initialValue: true,
    })
    if (p.isCancel(testnetResult)) { p.cancel('Cancelled'); process.exit(0) }
    testnet = testnetResult as boolean
  }

  const dir = resolve(process.cwd(), projectName)

  if (existsSync(dir)) {
    const msg = `Directory ${projectName} already exists`
    if (nonInteractive) { console.error('Error:', msg); process.exit(1) }
    p.cancel(msg)
    process.exit(1)
  }

  const vars = { projectName, price, testnet }

  if (nonInteractive) {
    console.log('Provisioning wallet...')
    const wallet = await provisionWallet(projectName)
    console.log('Wallet:', wallet.address)
    console.log('Scaffolding project...')
    mkdirSync(dir, { recursive: true })
    scaffold(dir, vars, wallet)
    console.log('Installing dependencies...')
    execSync('npm install', { cwd: dir, stdio: 'ignore' })
    if (!flags.startDev) {
      printSuccess(projectName)
      return
    }

    printAutoStart(projectName)
    await startDevServer(dir)
    return
  }

  const walletSpinner = p.spinner()
  walletSpinner.start('Provisioning wallet')
  const wallet = await provisionWallet(projectName)
  walletSpinner.stop(`Wallet: ${wallet.address}`)

  const scaffoldSpinner = p.spinner()
  scaffoldSpinner.start('Scaffolding project')
  mkdirSync(dir, { recursive: true })
  scaffold(dir, vars, wallet)
  scaffoldSpinner.stop('Project scaffolded')

  const installSpinner = p.spinner()
  installSpinner.start('Installing dependencies')
  execSync('npm install', { cwd: dir, stdio: 'ignore' })
  installSpinner.stop('Dependencies installed')

  if (!flags.startDev) {
    p.outro(successMessage(projectName))
    return
  }

  p.outro(autoStartMessage(projectName))
  await startDevServer(dir)
}

function successMessage(name: string): string {
  return [
    pc.green('✓') + ` Project ready at ${pc.bold(`./${name}`)}`,
    '',
    pc.bold('Next steps:'),
    `  cd ${name} && npm run dev`,
    '',
    pc.bold('Test payment:'),
    '  npx mppx http://localhost:3000/paid',
    '',
    pc.yellow('⚠') + ` Wallet address and private key are in ${pc.bold('.env.local')} — back them up`,
  ].join('\n')
}

function autoStartMessage(name: string): string {
  return [
    pc.green('✓') + ` Project ready at ${pc.bold(`./${name}`)}`,
    '',
    pc.bold('Starting dev server:'),
    `  cd ${name} && npm run dev`,
    '',
    pc.bold('Test payment once it is ready:'),
    '  npx mppx http://localhost:3000/paid',
    '',
    pc.yellow('⚠') + ` Wallet address and private key are in ${pc.bold('.env.local')} — back them up`,
  ].join('\n')
}

function printSuccess(name: string): void {
  console.log([
    '',
    `✓ Project ready at ./${name}`,
    '',
    'Next steps:',
    `  cd ${name} && npm run dev`,
    '',
    'Test payment:',
    '  npx mppx http://localhost:3000/paid',
    '',
    '⚠ Wallet address and private key are in .env.local — back them up',
  ].join('\n'))
}

function printAutoStart(name: string): void {
  console.log([
    '',
    `✓ Project ready at ./${name}`,
    '',
    'Starting dev server:',
    `  cd ${name} && npm run dev`,
    '',
    'Test payment once it is ready:',
    '  npx mppx http://localhost:3000/paid',
    '',
    '⚠ Wallet address and private key are in .env.local — back them up',
  ].join('\n'))
}

async function startDevServer(dir: string): Promise<void> {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(npmCommand, ['run', 'dev'], {
      cwd: dir,
      stdio: 'inherit',
    })

    child.once('error', rejectPromise)
    child.once('exit', (code, signal) => {
      if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') {
        resolvePromise()
        return
      }

      rejectPromise(new Error(`Dev server exited unexpectedly (${signal ?? `code ${code}`}).`))
    })
  })
}

main().catch((err) => {
  console.error(err instanceof Error ? `Error: ${err.message}` : err)
  process.exit(1)
})
