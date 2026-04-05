import { getServerConfig } from '../config/env.mjs';

let pool;

async function loadOracleDb() {
  let mod;
  try {
    mod = await import('oracledb');
  } catch {
    throw new Error('Driver oracledb nao instalado. Execute: npm install oracledb');
  }

  const driver = mod?.default ?? mod;
  if (!driver || typeof driver.createPool !== 'function') {
    throw new Error('Driver oracledb carregado em formato invalido.');
  }

  return driver;
}

export async function getOraclePool() {
  const config = getServerConfig();
  if (config.dbDialect !== 'oracle') {
    return null;
  }

  if (pool) {
    return pool;
  }

  const oracledb = await loadOracleDb();

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

  const oracledb = await loadOracleDb();
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
