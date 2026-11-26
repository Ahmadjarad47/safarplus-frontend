import { HttpErrorResponse } from '@angular/common/http';

/** Extracts a human-readable message from a Laravel-style error response. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body: unknown = error.error;
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const message = record['message'];
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    const errors = record['errors'];
    if (errors && typeof errors === 'object') {
      const parts = Object.values(errors as Record<string, unknown>).flatMap((value) =>
        Array.isArray(value) ? value.map(String) : value != null ? [String(value)] : []
      );
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
  }

  if (error.status === 401) {
    return 'انتهت الجلسة أو غير مصرح لك. يرجى تسجيل الدخول مجدداً.';
  }

  return fallback;
}
