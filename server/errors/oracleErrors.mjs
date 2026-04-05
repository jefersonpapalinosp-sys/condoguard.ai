export function summarizeOracleError(error) {
  const raw = String(error?.message || 'oracle_unavailable').trim();
  if (!raw) {
    return 'oracle_unavailable';
  }

  return raw.replace(/\s+/g, ' ').slice(0, 160);
}

export function createOracleUnavailableError(error) {
  const err = new Error('Oracle indisponivel para este ambiente.');
  err.name = 'OracleUnavailableError';
  err.status = 503;
  err.code = 'ORACLE_UNAVAILABLE';
  err.details = {
    fallbackAllowed: false,
    summary: summarizeOracleError(error),
  };
  return err;
}
