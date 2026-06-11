import { execSync, spawn } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { createServer } from 'net'
import { stdin as input, stdout as output } from 'node:process'
import { createInterface, type Interface } from 'node:readline/promises'
import { resolve } from 'path'
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

  const project = nonInteractive
    ? resolveNonInteractiveInputs(argName, flags)
    : await promptForInputs(argName, flags)

  const dir = resolve(process.cwd(), project.projectName)

  if (existsSync(dir)) {
    console.error(`Error: Directory ${project.projectName} already exists`)
    process.exit(1)
  }

  console.log('Provisioning wallet...')
  const wallet = await provisionWallet(project.projectName)
  console.log(`Wallet: ${wallet.address}`)

  console.log('Scaffolding project...')
  mkdirSync(dir, { recursive: true })
  scaffold(dir, project, wallet)

  console.log('Installing dependencies...')
  execSync('npm install', { cwd: dir, stdio: 'ignore' })

  const devPort = await findAvailablePort()

  if (!flags.startDev) {
    printSuccess(project.projectName, devPort)
    return
  }

  printAutoStart(project.projectName, devPort)
  await startDevServer(dir, devPort)
}

function resolveNonInteractiveInputs(
  projectName: string | undefined,
  flags: Flags,
): { projectName: string; price: string; testnet: boolean } {
  if (!projectName) {
    console.error(
      'Error: project name required in non-interactive mode\nUsage: create-mpp-app <name> [--price=0.01] [--testnet|--mainnet] [--yes] [--no-dev]',
    )
    process.exit(1)
  }

  return {
    projectName,
    price: flags.price,
    testnet: flags.testnet,
  }
}

async function promptForInputs(
  projectName: string | undefined,
  flags: Flags,
): Promise<{ projectName: string; price: string; testnet: boolean }> {
  console.log('\ncreate-mpp-app\n')

  const rl = createInterface({ input, output })
  const handleSigint = () => {
    output.write('\nCancelled\n')
    rl.close()
    process.exit(0)
  }

  process.once('SIGINT', handleSigint)

  try {
    const resolvedProjectName = projectName
      ? projectName
      : await promptText(rl, 'Project name', 'my-mpp-api', (value) =>
          value ? undefined : 'Project name is required.',
        )

    const price = await promptText(rl, 'Price per call (USDC)', flags.price, (value) =>
      isNaN(Number(value)) || Number(value) <= 0 ? 'Price must be a positive number.' : undefined,
    )

    const testnet = await promptConfirm(rl, 'Use testnet (Tempo Moderato)?', flags.testnet)

    return {
      projectName: resolvedProjectName,
      price,
      testnet,
    }
  } finally {
    process.off('SIGINT', handleSigint)
    rl.close()
  }
}

async function promptText(
  rl: Interface,
  label: string,
  initialValue: string,
  validate: (value: string) => string | undefined,
): Promise<string> {
  while (true) {
    const answer = (await rl.question(`${label} (${initialValue}): `)).trim()
    const value = answer || initialValue
    const error = validate(value)

    if (!error) return value
    console.log(error)
  }
}

async function promptConfirm(rl: Interface, label: string, initialValue: boolean): Promise<boolean> {
  const suffix = initialValue ? '[Y/n]' : '[y/N]'

  while (true) {
    const answer = (await rl.question(`${label} ${suffix}: `)).trim().toLowerCase()
    if (!answer) return initialValue
    if (answer === 'y' || answer === 'yes') return true
    if (answer === 'n' || answer === 'no') return false
    console.log('Please enter yes or no.')
  }
}

function printSuccess(name: string, port: number): void {
  console.log([
    '',
    `Project ready at ./${name}`,
    '',
    'Next steps:',
    `  cd ${name} && npm run dev -- --port ${port}`,
    '',
    'Test payment once it is ready:',
    `  tempo request http://localhost:${port}/paid`,
    '',
    'Wallet address and private key are in .env.local. Back them up.',
  ].join('\n'))
}

function printAutoStart(name: string, port: number): void {
  console.log([
    '',
    `Project ready at ./${name}`,
    '',
    'Starting dev server:',
    `  cd ${name} && npm run dev -- --port ${port}`,
    '',
    'Test payment once it is ready:',
    `  tempo request http://localhost:${port}/paid`,
    '',
    'Wallet address and private key are in .env.local. Back them up.',
  ].join('\n'))
}

async function startDevServer(dir: string, port: number): Promise<void> {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(npmCommand, ['run', 'dev', '--', '--port', String(port)], {
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

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 100; port += 1) {
    const available = await canBindPort(port)
    if (available) return port
  }

  throw new Error(`Could not find an open localhost port starting at ${startPort}.`)
}

async function canBindPort(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolvePromise) => {
    const server = createServer()

    server.once('error', () => {
      resolvePromise(false)
    })

    server.once('listening', () => {
      server.close(() => resolvePromise(true))
    })

    server.listen(port, '127.0.0.1')
  })
}

main().catch((err) => {
  console.error(err instanceof Error ? `Error: ${err.message}` : err)
  process.exit(1)
})
