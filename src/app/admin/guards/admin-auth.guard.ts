import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanMatchFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

/**
 * Company-admin area. Uses `canMatch` so the lazy chunks of the area are not even
 * downloaded for unauthorised users. On the server there is no session, so SSR/prerender
 * matches (the client re-evaluates the guard on hydration).
 */
export const adminAuthGuard: CanMatchFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  const router = inject(Router);
  const auth = inject(AdminAuthService);

  if (auth.isAuthenticated()) {
    if (auth.isSuperAdmin()) {
      return router.createUrlTree(['/super-admin/dashboard']);
    }

    if (auth.isCompanyAdmin()) {
      return true;
    }

    auth.clearSession();
  }

  return router.createUrlTree(['/admin/login']);
};
