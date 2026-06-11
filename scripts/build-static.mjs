import { mkdir, rm, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = resolve(rootDir, 'public')

await rm(publicDir, { recursive: true, force: true })
await mkdir(publicDir, { recursive: true })
await copyFile(resolve(rootDir, 'index.html'), resolve(publicDir, 'index.html'))
