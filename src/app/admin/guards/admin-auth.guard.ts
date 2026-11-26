import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminAuthGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const auth = inject(AdminAuthService);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

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
