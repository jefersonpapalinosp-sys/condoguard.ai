import path from 'node:path';
import os from 'node:os';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { persistSecurityEvent } from '../../../server/audit/securityAudit.mjs';

describe('persistSecurityEvent', () => {
  it('writes JSONL line when persistence is enabled', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'condoguard-audit-'));
    const logPath = path.join(tempDir, 'security-audit.log');

    await persistSecurityEvent(
      {
        securityAuditLogEnabled: true,
        securityAuditPersistEnabled: true,
        securityAuditLogPath: logPath,
      },
      { event: 'auth_login_success', ts: '2026-04-04T00:00:00.000Z' },
    );

    const content = await readFile(logPath, 'utf8');
    expect(content).toContain('"event":"auth_login_success"');
  });

  it('does not write file when persistence is disabled', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'condoguard-audit-'));
    const logPath = path.join(tempDir, 'security-audit.log');

    await persistSecurityEvent(
      {
        securityAuditLogEnabled: true,
        securityAuditPersistEnabled: false,
        securityAuditLogPath: logPath,
      },
      { event: 'auth_login_success', ts: '2026-04-04T00:00:00.000Z' },
    );

    await expect(stat(logPath)).rejects.toBeTruthy();
  });
});
