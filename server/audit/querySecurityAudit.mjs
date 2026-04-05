import path from 'node:path';
import { readFile } from 'node:fs/promises';

function resolveAuditLogPath(logPath) {
  if (!logPath) {
    return null;
  }
  return path.isAbsolute(logPath) ? logPath : path.resolve(process.cwd(), logPath);
}

function parseIsoDate(value) {
  if (!value) {
    return null;
  }
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function tryParseLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export async function querySecurityAuditEvents(config, filters = {}) {
  const resolvedPath = resolveAuditLogPath(config?.securityAuditLogPath);
  if (!resolvedPath) {
    return [];
  }

  let content = '';
  try {
    content = await readFile(resolvedPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const fromTs = parseIsoDate(filters.from);
  const toTs = parseIsoDate(filters.to);

  const entries = content
    .split(/\r?\n/)
    .filter(Boolean)
    .map(tryParseLine)
    .filter(Boolean)
    .filter((entry) => {
      if (filters.event && entry.event !== filters.event) {
        return false;
      }
      if (filters.actorSub && entry.actorSub !== filters.actorSub) {
        return false;
      }
      if (filters.condominiumId && Number(entry.condominiumId || 0) !== Number(filters.condominiumId)) {
        return false;
      }

      const entryTs = parseIsoDate(entry.ts);
      if (fromTs && (!entryTs || entryTs < fromTs)) {
        return false;
      }
      if (toTs && (!entryTs || entryTs > toTs)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ats = parseIsoDate(a.ts) || 0;
      const bts = parseIsoDate(b.ts) || 0;
      return bts - ats;
    });

  const limit = Math.max(1, Number(filters.limit || 100));
  return entries.slice(0, limit);
}
