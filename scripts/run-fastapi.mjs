import { spawn } from 'node:child_process';

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
const pythonBin = process.env.PYTHON_BIN || (isWindows ? 'py' : 'python3');
const pythonVersion = process.env.PYTHON_VERSION || '3.12';
const launchArgs = isWindows && pythonBin === 'py' ? [`-${pythonVersion}`, ...uvicornArgs] : uvicornArgs;

const child = spawn(pythonBin, launchArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

