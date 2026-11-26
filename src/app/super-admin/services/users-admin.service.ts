import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import { getApiErrorMessage as apiErrorMessage } from '../../core/http/api-error';

export type AdminUserStatus = 'active' | 'blocked';

export interface AdminUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  role: string;
  roles: string[];
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserPayload {
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  role: string;
  status: AdminUserStatus;
  password?: string;
}

interface BackendUserRaw {
  id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  role?: string;
  roles?: Array<string | { name?: string }>;
  status?: string | number | boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();
  private readonly usersPath = `${this.apiBaseUrl}/admin/users`;

  async fetchUsers(): Promise<AdminUser[]> {
    const raw = await firstValueFrom(
      this.http.get<unknown>(this.usersPath)
    );

    return this.extractUsers(raw).map((user) => this.mapBackendUser(user));
  }

  async createUser(payload: AdminUserPayload): Promise<AdminUser | null> {
    const raw = await firstValueFrom(
      this.http.post<unknown>(this.usersPath, payload)
    );

    return this.extractUser(raw);
  }

  async updateUser(id: string, payload: AdminUserPayload): Promise<AdminUser | null> {
    const raw = await firstValueFrom(
      this.http.post<unknown>(`${this.usersPath}/${id}`, payload)
    );

    return this.extractUser(raw);
  }

  async setUserStatus(id: string, status: AdminUserStatus): Promise<AdminUser | null> {
    const raw = await firstValueFrom(
      this.http.post<unknown>(`${this.usersPath}/${id}/status`, { status })
    );

    return this.extractUser(raw);
  }

  async deleteUser(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<unknown>(`${this.usersPath}/${id}`)
    );
  }

  mapBackendUser(user: BackendUserRaw): AdminUser {
    const roles = this.normalizeRoles(user.roles, user.role);

    return {
      id: String(user.id ?? ''),
      name: user.name ?? this.fullName(user.first_name, user.last_name),
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      address: user.address ?? '',
      city: user.city ?? '',
      role: roles[0] ?? 'user',
      roles,
      status: this.normalizeStatus(user.status),
      createdAt: this.formatDate(user.created_at),
      updatedAt: this.formatDate(user.updated_at),
    };
  }

  getApiErrorMessage(error: unknown, fallback: string): string {
    return apiErrorMessage(error, fallback);
  }

  private extractUsers(response: unknown): BackendUserRaw[] {
    if (Array.isArray(response)) {
      return response as BackendUserRaw[];
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const root = response as Record<string, unknown>;
    if (Array.isArray(root['users'])) {
      return root['users'] as BackendUserRaw[];
    }

    if (root['data'] && typeof root['data'] === 'object') {
      const data = root['data'] as Record<string, unknown>;
      if (Array.isArray(data['users'])) {
        return data['users'] as BackendUserRaw[];
      }
    }

    return [];
  }

  private extractUser(response: unknown): AdminUser | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const root = response as Record<string, unknown>;
    const data = root['data'];
    const raw =
      data && typeof data === 'object' && (data as Record<string, unknown>)['user']
        ? (data as Record<string, unknown>)['user']
        : root['user'];

    return raw && typeof raw === 'object'
      ? this.mapBackendUser(raw as BackendUserRaw)
      : null;
  }

  private normalizeRoles(roles: BackendUserRaw['roles'], fallback?: string): string[] {
    if (!Array.isArray(roles)) {
      return fallback ? [fallback] : [];
    }

    return roles
      .map((role) => (typeof role === 'string' ? role : role?.name ?? ''))
      .filter((role) => role.trim().length > 0);
  }

  private normalizeStatus(status: BackendUserRaw['status']): AdminUserStatus {
    if (status === 0 || status === false || String(status ?? '').toLowerCase() === 'blocked') {
      return 'blocked';
    }

    return 'active';
  }

  private fullName(firstName?: string, lastName?: string): string {
    const full = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    return full || 'مستخدم';
  }

  private formatDate(iso?: string): string {
    if (!iso) return '-';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }

    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

}
