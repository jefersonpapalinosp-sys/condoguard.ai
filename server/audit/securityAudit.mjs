import path from 'node:path';
import { appendFile, mkdir } from 'node:fs/promises';

function resolveAuditLogPath(logPath) {
  if (!logPath) {
    return null;
  }
  return path.isAbsolute(logPath) ? logPath : path.resolve(process.cwd(), logPath);
}

export async function persistSecurityEvent(config, payload) {
  if (!config?.securityAuditLogEnabled || !config?.securityAuditPersistEnabled) {
    return;
  }

  const resolvedPath = resolveAuditLogPath(config.securityAuditLogPath);
  if (!resolvedPath) {
    return;
  }

  const line = `${JSON.stringify(payload)}\n`;
  const folder = path.dirname(resolvedPath);
  await mkdir(folder, { recursive: true });
  await appendFile(resolvedPath, line, 'utf8');
}
