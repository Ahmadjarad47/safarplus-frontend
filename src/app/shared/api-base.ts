export function resolveApiV1BaseUrl(): string {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000/api/v1';
    }

    const apiHostname =
      hostname === 'safarplus.net' || hostname === 'www.safarplus.net'
        ? 'api.safarplus.net'
        : hostname;

    return `${protocol}//${apiHostname}/api/v1`;
  }

  return 'http://127.0.0.1:8000/api/v1';
}
