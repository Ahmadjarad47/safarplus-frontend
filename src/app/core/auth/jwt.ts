/**
 * Returns the `exp` claim (ms since epoch) of a JWT, or null when the token is not a JWT
 * (e.g. an opaque Sanctum token) or carries no expiry.
 */
export function getJwtExpiryMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewMs = 5_000): boolean {
  const expiry = getJwtExpiryMs(token);
  return expiry !== null && expiry - skewMs <= Date.now();
}
