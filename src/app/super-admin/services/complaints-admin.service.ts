import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';

export interface ComplaintUserApi {
  id?: number;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
}

export interface ComplaintApiRow {
  id: number;
  user_id?: number;
  message: string;
  response?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user?: ComplaintUserApi;
}

/** Normalized row for the super-admin complaints table */
export interface ComplaintListItem {
  id: string;
  userId: number;
  message: string;
  adminResponse: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  passengerCity: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComplaintsAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  readonly complaintsPath = `${this.apiBaseUrl}/admin/complaints`;

  async fetchComplaints(): Promise<ComplaintListItem[]> {
    const raw = await firstValueFrom(
      this.http.get<unknown>(this.complaintsPath, this.getRequestOptions())
    );
    const rows = this.extractComplaintRows(raw);
    return rows.map((r) => this.mapBackendToComplaint(r));
  }

  async deleteComplaint(id: string | number): Promise<void> {
    await firstValueFrom(
      this.http.delete<unknown>(
        `${this.complaintsPath}/${id}`,
        this.getRequestOptions()
      )
    );
  }

  async closeComplaint(id: string | number): Promise<void> {
    await firstValueFrom(
      this.http.post<unknown>(
        `${this.complaintsPath}/${id}/close`,
        {},
        this.getRequestOptions()
      )
    );
  }

  async respondComplaint(id: string | number, response: string): Promise<void> {
    await firstValueFrom(
      this.http.post<unknown>(
        `${this.complaintsPath}/${id}/respond`,
        { response },
        this.getRequestOptions()
      )
    );
  }

  extractComplaintRows(response: unknown): ComplaintApiRow[] {
    if (Array.isArray(response)) {
      return response as ComplaintApiRow[];
    }
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      if (Array.isArray(r['complaints'])) {
        return r['complaints'] as ComplaintApiRow[];
      }
      if (r['data'] && typeof r['data'] === 'object') {
        const d = r['data'] as Record<string, unknown>;
        if (Array.isArray(d['complaints'])) {
          return d['complaints'] as ComplaintApiRow[];
        }
      }
    }
    return [];
  }

  mapBackendToComplaint(row: ComplaintApiRow): ComplaintListItem {
    const u = row.user;
    const first = u?.first_name?.trim() ?? '';
    const last = u?.last_name?.trim() ?? '';
    const combined = `${first} ${last}`.trim();
    const passengerName =
      combined || u?.name?.trim() || '—';

    return {
      id: String(row.id),
      userId: row.user_id ?? u?.id ?? 0,
      message: row.message ?? '',
      adminResponse:
        row.response === undefined || row.response === null ? null : row.response,
      status: (row.status ?? '').toLowerCase(),
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
      passengerName,
      passengerPhone: u?.phone ?? '—',
      passengerEmail: u?.email ?? '—',
      passengerCity: u?.city ?? '—'
    };
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private getRequestOptions() {
    return {
      headers: this.getAuthHeaders()
    };
  }

  private getAuthHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('admin_token') ?? sessionStorage.getItem('admin_token');
    let headers = new HttpHeaders({
      Accept: 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  getApiErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    const responseMessage = error.error?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
      return responseMessage;
    }

    if (error.status === 401) {
      return 'غير مصرح لك. تحقق من وجود admin_token في التخزين المحلي.';
    }

    return fallback;
  }
}
