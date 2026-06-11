import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { Wallet } from './wallet.js'
import {
  envExampleTemplate,
  envTemplate,
  gitignoreTemplate,
  nextConfigTemplate,
  packageJsonTemplate,
  routeTemplate,
  tsconfigTemplate,
  type TemplateVars,
} from './templates.js'

export function scaffold(dir: string, vars: TemplateVars, wallet: Wallet): void {
  const write = (rel: string, content: string) => {
    const abs = join(dir, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf8')
  }

  write('package.json', packageJsonTemplate(vars))
  write('tsconfig.json', tsconfigTemplate())
  write('next.config.ts', nextConfigTemplate())
  write('.gitignore', gitignoreTemplate())
  write('.env.local', envTemplate({ ...vars, ...wallet }))
  write('.env.example', envExampleTemplate(vars))
  write('src/app/paid/route.ts', routeTemplate(vars))
  write(
    'src/app/page.tsx',
    `export default function Home() {
  return (
    <main>
      <h1>{process.env.npm_package_name}</h1>
      <p>Paid endpoint: <code>GET /paid</code></p>
    </main>
  )
}
`,
  )
}
