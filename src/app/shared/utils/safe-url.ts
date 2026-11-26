/** True for absolute http(s) URLs only (blocks `javascript:`, `data:`, `file:` ...). */
export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** Opens an http(s) URL in a new tab without exposing `window.opener`. No-op for anything else. */
export function openExternalUrl(url: string | null | undefined): void {
  if (isHttpUrl(url) && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
