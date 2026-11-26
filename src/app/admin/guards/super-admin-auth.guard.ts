import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanMatchFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

/** Super-admin area; see `adminAuthGuard` for why this is a `canMatch` guard. */
export const superAdminAuthGuard: CanMatchFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  const router = inject(Router);
  const auth = inject(AdminAuthService);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/admin/login']);
  }

  return auth.isSuperAdmin() ? true : router.createUrlTree(['/admin/dashboard']);
};
