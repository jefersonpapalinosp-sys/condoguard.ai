import { getServerConfig } from '../config/env.mjs';

let pool;

export async function getOraclePool() {
  const config = getServerConfig();
  if (config.dbDialect !== 'oracle') {
    return null;
  }

  if (pool) {
    return pool;
  }

  let oracledb;
  try {
    oracledb = await import('oracledb');
  } catch {
    throw new Error('Driver oracledb nao instalado. Execute: npm install oracledb');
  }

  if (!config.oracle.user || !config.oracle.password || !config.oracle.connectString) {
    throw new Error('Credenciais Oracle incompletas no ambiente.');
  }

  pool = await oracledb.createPool({
    user: config.oracle.user,
    password: config.oracle.password,
    connectString: config.oracle.connectString,
    poolMin: config.oracle.poolMin,
    poolMax: config.oracle.poolMax,
  });

  return pool;
}

export async function runOracleQuery(sql, binds = {}, options = {}) {
  const p = await getOraclePool();
  if (!p) {
    return null;
  }

  const oracledb = await import('oracledb');
  const connection = await p.getConnection();

  try {
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options,
    });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function closeOraclePool() {
  if (pool) {
    await pool.close(5);
    pool = null;
  }
}
