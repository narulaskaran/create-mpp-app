import { mkdir, rm, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = resolve(rootDir, 'public')
const staticFiles = ['index.html', 'site.js', 'styles.css']

await rm(publicDir, { recursive: true, force: true })
await mkdir(publicDir, { recursive: true })

await Promise.all(
  staticFiles.map((file) => copyFile(resolve(rootDir, file), resolve(publicDir, file))),
)
