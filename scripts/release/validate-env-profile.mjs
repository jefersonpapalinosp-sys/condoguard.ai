import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

function parseArgs(argv) {
  const args = { envFile: '.env', requireOidc: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--config-file' && argv[i + 1]) {
      args.envFile = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--require-oidc') {
      args.requireOidc = true;
    }
  }
  return args;
}

function getEnv(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

function asBool(name, fallback = false) {
  return getEnv(name, fallback ? 'true' : 'false').toLowerCase() === 'true';
}

function fail(errors, message) {
  errors.push(message);
}

function parseOidcAlgs() {
  return getEnv('OIDC_ALLOWED_ALGS', 'RS256')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function validateOidc(errors, envName, requireOidc) {
  const provider = getEnv('AUTH_PROVIDER', 'local_jwt').toLowerCase();
  const usingOidc = requireOidc || provider === 'oidc_jwks';

  if (requireOidc && provider !== 'oidc_jwks') {
    const suffix = envName === 'prod' ? '.' : ' quando --require-oidc.';
    fail(errors, `Em ${envName}, AUTH_PROVIDER deve ser oidc_jwks${suffix}`);
  }

  if (!usingOidc) {
    return;
  }

  if (asBool('AUTH_PASSWORD_LOGIN_ENABLED', true)) {
    fail(errors, `Em ${envName}, AUTH_PASSWORD_LOGIN_ENABLED deve ser false quando OIDC real estiver ativo.`);
  }
  if (asBool('ENABLE_DEMO_AUTH', false)) {
    fail(errors, `Em ${envName}, ENABLE_DEMO_AUTH deve ser false quando OIDC real estiver ativo.`);
  }
  if (!getEnv('OIDC_ISSUER') || !getEnv('OIDC_AUDIENCE') || !getEnv('OIDC_JWKS_URL')) {
    fail(errors, `Em ${envName}, OIDC_ISSUER/OIDC_AUDIENCE/OIDC_JWKS_URL devem estar preenchidos.`);
  }
  if (!getEnv('OIDC_ROLE_CLAIM') || !getEnv('OIDC_TENANT_CLAIM')) {
    fail(errors, `Em ${envName}, OIDC_ROLE_CLAIM e OIDC_TENANT_CLAIM devem estar preenchidos.`);
  }

  const algs = parseOidcAlgs();
  if (algs.length === 0) {
    fail(errors, `Em ${envName}, OIDC_ALLOWED_ALGS deve conter ao menos um algoritmo.`);
    return;
  }
  if (algs.some((alg) => !/^RS(256|384|512)$/.test(alg))) {
    fail(errors, `Em ${envName}, OIDC_ALLOWED_ALGS deve usar apenas RS256, RS384 ou RS512.`);
  }
}

function validateCommon(errors) {
  const cors = getEnv('CORS_ALLOWED_ORIGINS');
  if (!cors || cors.includes('*')) {
    fail(errors, 'CORS_ALLOWED_ORIGINS nao pode estar vazio nem conter wildcard (*).');
  }
}

function validateDev(errors) {
  const dialect = getEnv('DB_DIALECT', 'mock').toLowerCase();
  if (!['mock', 'oracle'].includes(dialect)) {
    fail(errors, 'DB_DIALECT em dev deve ser mock ou oracle.');
  }
}

function validateHml(errors, requireOidc) {
  if (getEnv('DB_DIALECT').toLowerCase() !== 'oracle') {
    fail(errors, 'Em hml, DB_DIALECT deve ser oracle.');
  }
  if (asBool('ALLOW_ORACLE_SEED_FALLBACK', true)) {
    fail(errors, 'Em hml, ALLOW_ORACLE_SEED_FALLBACK deve ser false.');
  }
  validateOidc(errors, 'hml', requireOidc);
}

function validateProd(errors) {
  if (!getEnv('JWT_SECRET') || getEnv('JWT_SECRET') === 'CHANGE_ME_LONG_RANDOM_SECRET') {
    fail(errors, 'Em prod, JWT_SECRET deve estar definido com valor seguro.');
  }
  if (getEnv('DB_DIALECT').toLowerCase() !== 'oracle') {
    fail(errors, 'Em prod, DB_DIALECT deve ser oracle.');
  }
  if (asBool('ALLOW_ORACLE_SEED_FALLBACK', true)) {
    fail(errors, 'Em prod, ALLOW_ORACLE_SEED_FALLBACK deve ser false.');
  }
  validateOidc(errors, 'prod', true);
}

function resolveEnvFile(envFile) {
  return {
    absoluteEnvFile: path.resolve(process.cwd(), envFile),
    resolvedEnvFile: envFile,
  };
}

function main() {
  const { envFile, requireOidc } = parseArgs(process.argv.slice(2));
  const { absoluteEnvFile, resolvedEnvFile } = resolveEnvFile(envFile);

  if (!fs.existsSync(absoluteEnvFile)) {
    console.error(`[env:validate] arquivo nao encontrado: ${absoluteEnvFile}`);
    process.exit(1);
  }

  dotenv.config({ path: absoluteEnvFile, override: true });
  const appEnv = getEnv('APP_ENV', 'dev').toLowerCase();
  const errors = [];

  validateCommon(errors);
  if (appEnv === 'dev') validateDev(errors);
  if (appEnv === 'hml') validateHml(errors, requireOidc);
  if (appEnv === 'prod') validateProd(errors);
  if (appEnv === 'dev' && requireOidc) {
    validateOidc(errors, 'dev', true);
  }
  if (!['dev', 'hml', 'prod'].includes(appEnv)) {
    fail(errors, `APP_ENV invalido (${appEnv}). Use dev, hml ou prod.`);
  }

  if (appEnv !== 'prod' && (!getEnv('JWT_SECRET') || getEnv('JWT_SECRET') === 'CHANGE_ME_LONG_RANDOM_SECRET')) {
    console.warn('[env:validate] aviso: JWT_SECRET ainda esta com placeholder (aceito fora de prod).');
  }

  if (errors.length > 0) {
    console.error(`[env:validate] perfil ${appEnv} INVALIDO (${absoluteEnvFile})`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const suffix = requireOidc ? ' | modo=require-oidc' : '';
  console.log(`[env:validate] perfil ${appEnv} OK (${absoluteEnvFile})${suffix}`);
}

main();
