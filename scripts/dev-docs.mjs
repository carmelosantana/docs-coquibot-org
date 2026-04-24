import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const nextBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next')

const watcher = spawn(process.execPath, [path.join(projectRoot, 'scripts', 'sync-docs.mjs'), '--watch', '--skip-initial'], {
  cwd: projectRoot,
  stdio: 'inherit',
})

const next = spawn(nextBin, ['dev'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
})

let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  watcher.kill('SIGTERM')
  next.kill('SIGTERM')
  process.exit(code)
}

watcher.on('exit', code => {
  if (!shuttingDown && code !== 0) {
    shutdown(code ?? 1)
  }
})

next.on('exit', code => {
  shutdown(code ?? 0)
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))