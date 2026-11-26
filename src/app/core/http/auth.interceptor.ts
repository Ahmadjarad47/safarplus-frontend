import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AdminAuthService } from '../../admin/services/admin-auth.service';
import { resolveApiOrigin, resolveApiV1BaseUrl } from '../../shared/api-base';

const API_ORIGIN = resolveApiOrigin();
const LOGIN_URL = `${resolveApiV1BaseUrl()}/auth/login`;

function isApiRequest(url: string): boolean {
  if (!API_ORIGIN) {
    return false;
  }
  try {
    return new URL(url, API_ORIGIN).origin === API_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Attaches the bearer token ONLY to requests that target the configured API origin and
 * signs the user out when the API answers 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const auth = inject(AdminAuthService);
  const router = inject(Router);

  const token = auth.getToken();
  let headers = req.headers;
  if (!headers.has('Accept')) {
    headers = headers.set('Accept', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return next(req.clone({ headers })).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token &&
        req.url !== LOGIN_URL
      ) {
        auth.clearSession();
        void router.navigate(['/admin/login']);
      }
      return throwError(() => error);
    })
  );
};
