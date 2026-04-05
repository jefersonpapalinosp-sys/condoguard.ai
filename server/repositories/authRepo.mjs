import { createHash } from 'node:crypto';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';

const DEMO_USERS = new Map([
  ['admin@condoguard.ai', { password: 'password123', role: 'admin', condominiumId: 1 }],
  ['sindico@condoguard.ai', { password: 'password123', role: 'sindico', condominiumId: 1 }],
  ['morador@condoguard.ai', { password: 'password123', role: 'morador', condominiumId: 1 }],
]);

function hashPassword(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function verifyPassword(password, passwordHash) {
  return hashPassword(password) === String(passwordHash || '').toLowerCase();
}

export async function findAccountForLogin(email, password, configOverride = null) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const config = configOverride || getServerConfig();
  if (config.dbDialect === 'oracle') {
    try {
      const rows = await runOracleQuery(
        `
          select
            email,
            password_hash,
            role,
            condominium_id,
            active
          from app.usuarios
          where lower(email) = :email
          fetch first 1 rows only
        `,
        { email: normalizedEmail },
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      const row = rows[0];
      if (Number(row.ACTIVE || 0) !== 1) {
        return null;
      }

      return {
        email: String(row.EMAIL).toLowerCase(),
        role: String(row.ROLE || '').toLowerCase(),
        condominiumId: Number(row.CONDOMINIUM_ID || 0) || null,
        passwordMatches: verifyPassword(password, row.PASSWORD_HASH),
      };
    } catch (error) {
      if (!config.enableDemoAuth) {
        throw error;
      }
    }
  }

  if (!config.enableDemoAuth) {
    return null;
  }

  const demo = DEMO_USERS.get(normalizedEmail);
  if (!demo) {
    return null;
  }

  return {
    email: normalizedEmail,
    role: demo.role,
    condominiumId: demo.condominiumId,
    passwordMatches: demo.password === password,
  };
}
