import { environment } from '../../environments/environment';

const API_BASE_URL = environment.apiBaseUrl.replace(/\/+$/, '');

/** Configured API v1 base URL (see `src/environments`). */
export function resolveApiV1BaseUrl(): string {
  return API_BASE_URL;
}

/** Origin (scheme + host + port) of the configured API. */
export function resolveApiOrigin(): string {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
}
