import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isJwtExpired } from '../../core/auth/jwt';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export interface AuthenticatedAdminUser {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  roles?: string[];
  company?: {
    id?: number;
    name?: string;
    code?: string;
  } | null;
  transportCompany?: {
    id?: number;
    name?: string;
  } | null;
  transport_company?: {
    id?: number;
    name?: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Returns the stored token, or null when missing or (for JWTs) expired. */
  getToken(): string | null {
    const token = this.getStoredItem(TOKEN_KEY);

    if (!token) {
      return null;
    }

    if (isJwtExpired(token)) {
      this.clearSession();
      return null;
    }

    return token;
  }

  setSession(token: string, userJson?: string): void {
    this.getStorage('localStorage')?.setItem(TOKEN_KEY, token);
    if (userJson) {
      this.getStorage('localStorage')?.setItem(USER_KEY, userJson);
    }
  }

  getUser(): AuthenticatedAdminUser | null {
    const raw = this.getStoredItem(USER_KEY);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as AuthenticatedAdminUser) : null;
    } catch {
      return null;
    }
  }

  hasRole(roleName: string): boolean {
    return this.getRoleNames().includes(this.normalizeRoleName(roleName));
  }

  isSuperAdmin(): boolean {
    const roles = this.getRoleNames();

    if (
      roles.includes('super admin') ||
      roles.includes('super-admin') ||
      roles.includes('super_admin') ||
      roles.includes('superadmin')
    ) {
      return true;
    }

    return false;
  }

  isCompanyAdmin(): boolean {
    const user = this.getUser();
    const roles = this.getRoleNames(user);
    const hasCompany = Boolean(user?.company || user?.transportCompany || user?.transport_company);

    if (this.isSuperAdmin()) {
      return false;
    }

    return Boolean(
      hasCompany ||
        roles.includes('admin') ||
        roles.includes('transport') ||
        roles.includes('company-admin') ||
        roles.includes('company_admin')
    );
  }

  getHomeRoute(): string {
    if (this.isSuperAdmin()) {
      return '/super-admin/dashboard';
    }

    return '/admin/dashboard';
  }

  clearSession(): void {
    this.getStorage('localStorage')?.removeItem(TOKEN_KEY);
    this.getStorage('localStorage')?.removeItem(USER_KEY);
    this.getStorage('sessionStorage')?.removeItem(TOKEN_KEY);
    this.getStorage('sessionStorage')?.removeItem(USER_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private getRoleNames(user = this.getUser()): string[] {
    const roles = user?.roles ?? [];
    const role = user?.role ? [user.role] : [];

    return [...roles, ...role]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => this.normalizeRoleName(value));
  }

  private normalizeRoleName(roleName: string): string {
    return roleName.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private getStoredItem(key: string): string | null {
    return this.getStorage('localStorage')?.getItem(key) ??
      this.getStorage('sessionStorage')?.getItem(key) ??
      null;
  }

  private getStorage(storageName: 'localStorage' | 'sessionStorage'): Storage | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      return window[storageName] ?? null;
    } catch {
      return null;
    }
  }
}
