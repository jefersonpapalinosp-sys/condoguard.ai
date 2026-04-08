import { spawn } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const services = [
  { label: 'api', color: '\x1b[36m', args: ['run', 'api:dev'] },
  { label: 'web', color: '\x1b[35m', args: ['run', 'dev'] },
];

const children = [];
let shuttingDown = false;

function pipeWithPrefix(stream, target, label, color) {
  if (!stream) {
    return;
  }

  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      target.write(`${color}[${label}]\x1b[0m ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffer) {
      target.write(`${color}[${label}]\x1b[0m ${buffer}\n`);
    }
  });
}

function stopAll(message, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  if (message) {
    process.stdout.write(`\n${message}\n`);
  }

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, 3000).unref();
    }
  }

  process.exitCode = exitCode;
}

for (const service of services) {
  const child = spawn(npmCmd, service.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  children.push(child);
  pipeWithPrefix(child.stdout, process.stdout, service.label, service.color);
  pipeWithPrefix(child.stderr, process.stderr, service.label, service.color);

  child.on('error', (error) => {
    stopAll(`Falha ao iniciar ${service.label}: ${error.message}`, 1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason =
      signal != null
        ? `${service.label} encerrou com sinal ${signal}.`
        : `${service.label} encerrou com codigo ${code ?? 1}.`;
    stopAll(reason, code ?? 1);
  });
}

process.stdout.write('Subindo frontend e API local...\n');
process.stdout.write('Frontend: http://localhost:3000\n');
process.stdout.write('API: http://localhost:4000\n');
process.stdout.write('Login local: admin@condoguard.ai / password123\n\n');

process.on('SIGINT', () => stopAll('Encerrando stack local...', 0));
process.on('SIGTERM', () => stopAll('Encerrando stack local...', 0));
