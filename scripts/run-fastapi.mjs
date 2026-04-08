import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const hasReload = args.includes('--reload');
const mode = args.find((value) => value === 'mock' || value === 'oracle') || null;

if (mode && !process.env.DB_DIALECT) {
  process.env.DB_DIALECT = mode;
}

const port = process.env.PORT || '4000';
const uvicornArgs = ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--port', port];
if (hasReload) {
  uvicornArgs.push('--reload');
}

const isWindows = process.platform === 'win32';
const pythonVersion = process.env.PYTHON_VERSION || '3.12';

function moduleCheckArgs(command) {
  if (isWindows && command === 'py') {
    return [`-${pythonVersion}`, '-c', 'import uvicorn, fastapi'];
  }
  return ['-c', 'import uvicorn, fastapi'];
}

function launchArgsFor(command) {
  if (isWindows && command === 'py') {
    return [`-${pythonVersion}`, ...uvicornArgs];
  }
  return uvicornArgs;
}

function hasBackendDeps(command) {
  const probe = spawnSync(command, moduleCheckArgs(command), {
    stdio: 'ignore',
    env: process.env,
  });
  return probe.status === 0;
}

function resolveProjectPythonCandidates() {
  const candidates = [];
  const cwd = process.cwd();

  if (isWindows) {
    candidates.push(path.join(cwd, '.venv', 'Scripts', 'python.exe'));
    candidates.push('py');
    candidates.push('python');
    return candidates;
  }

  candidates.push(path.join(cwd, '.venv', 'bin', 'python'));
  candidates.push('python3.11');
  candidates.push('python3.12');
  candidates.push('python3');
  candidates.push('python');
  return candidates;
}

function commandExists(command) {
  if (command.includes(path.sep)) {
    return fs.existsSync(command);
  }

  const check = spawnSync(isWindows ? 'where' : 'which', [command], {
    stdio: 'ignore',
    env: process.env,
  });
  return check.status === 0;
}

function resolvePythonCommand() {
  const explicitPython = process.env.PYTHON_BIN?.trim();
  const candidates = explicitPython ? [explicitPython] : resolveProjectPythonCandidates();

  const available = candidates.filter((candidate, index) => candidates.indexOf(candidate) === index && commandExists(candidate));
  const withDeps = available.find((candidate) => hasBackendDeps(candidate));
  if (withDeps) {
    return withDeps;
  }

  if (explicitPython) {
    console.error(`[run-fastapi] O interpretador configurado em PYTHON_BIN="${explicitPython}" nao possui uvicorn/fastapi.`);
  } else {
    console.error('[run-fastapi] Nenhum interpretador Python com uvicorn/fastapi foi encontrado automaticamente.');
  }

  if (available.length > 0) {
    console.error(`[run-fastapi] Candidatos verificados: ${available.join(', ')}`);
  }
  console.error('[run-fastapi] Instale as dependencias com um Python compativel, por exemplo:');
  if (isWindows) {
    console.error('  py -3.12 -m pip install -r backend/requirements.txt');
  } else {
    console.error('  python3.11 -m pip install -r backend/requirements.txt');
  }
  process.exit(1);
}

const pythonBin = resolvePythonCommand();
const launchArgs = launchArgsFor(pythonBin);

console.log(`[run-fastapi] Usando interpretador Python: ${pythonBin}`);

const child = spawn(pythonBin, launchArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
