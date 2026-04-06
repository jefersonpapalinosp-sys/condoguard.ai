import { spawn } from 'node:child_process';

const moduleAndArgs = process.argv.slice(2);
if (moduleAndArgs.length === 0) {
  console.error('Usage: node scripts/run-python-module.mjs <module> [...args]');
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const pythonBin = process.env.PYTHON_BIN || (isWindows ? 'py' : 'python3');
const pythonVersion = process.env.PYTHON_VERSION || '3.12';

const launchArgs = isWindows && pythonBin === 'py'
  ? [`-${pythonVersion}`, '-m', ...moduleAndArgs]
  : ['-m', ...moduleAndArgs];

const child = spawn(pythonBin, launchArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 1));

