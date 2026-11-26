import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Company, CompanyDocument } from './super-admin-state.service';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import { getApiErrorMessage as apiErrorMessage } from '../../core/http/api-error';

interface BackendTransportCompanyRaw {
  id?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  documents?: BackendDocumentRaw[] | unknown[];
  created_at?: string;
  updated_at?: string;
  address?: string;
  total_trips?: number;
  total_bookings?: number;
  user?: unknown;
}

interface BackendDocumentRaw {
  id?: number | string;
  name?: string;
  file_name?: string;
  fileName?: string;
  upload_date?: string;
  uploadDate?: string;
  status?: string;
  url?: string;
  file_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransportCompaniesAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  readonly companiesPath = `${this.apiBaseUrl}/admin/transport-companies`;

  async fetchCompanies(): Promise<Company[]> {
    const raw = await firstValueFrom(
      this.http.get<unknown>(this.companiesPath)
    );
    const list = this.extractCompanies(raw);
    return list.map((c) => this.mapBackendToCompany(c));
  }

  async updateCompany(id: string | number, body: Record<string, unknown>): Promise<void> {
    await firstValueFrom(
      this.http.post<unknown>(
        `${this.companiesPath}/${id}`,
        body
      )
    );
  }

  async approveCompany(id: string | number): Promise<void> {
    await firstValueFrom(
      this.http.post<unknown>(
        `${this.companiesPath}/${id}/approve`,
        {}
      )
    );
  }

  async rejectCompany(id: string | number): Promise<void> {
    await firstValueFrom(
      this.http.post<unknown>(
        `${this.companiesPath}/${id}/reject`,
        {}
      )
    );
  }

  async deleteCompany(id: string | number): Promise<void> {
    await firstValueFrom(
      this.http.delete<unknown>(`${this.companiesPath}/${id}`)
    );
  }

  extractCompanies(response: unknown): BackendTransportCompanyRaw[] {
    if (Array.isArray(response)) {
      return response as BackendTransportCompanyRaw[];
    }
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      if (Array.isArray(r['companies'])) {
        return r['companies'] as BackendTransportCompanyRaw[];
      }
      if (r['data'] && typeof r['data'] === 'object') {
        const d = r['data'] as Record<string, unknown>;
        if (Array.isArray(d['companies'])) {
          return d['companies'] as BackendTransportCompanyRaw[];
        }
      }
    }
    return [];
  }

  mapBackendToCompany(bc: BackendTransportCompanyRaw): Company {
    const id = String(bc.id ?? '');
    const documents = Array.isArray(bc.documents)
      ? bc.documents
          .filter((doc): doc is Record<string, unknown> => doc !== null && typeof doc === 'object')
          .map((doc, idx) => this.mapBackendDocument(doc as BackendDocumentRaw, idx))
      : [];

    return {
      id,
      name: bc.name ?? '',
      email: bc.email ?? '',
      phone: bc.phone ?? '',
      address: bc.address ?? '',
      status: this.normalizeCompanyStatus(bc.status),
      registrationDate: this.formatDate(bc.created_at),
      totalTrips: Number(bc.total_trips ?? 0),
      totalBookings: Number(bc.total_bookings ?? 0),
      documents
    };
  }

  normalizeCompanyStatus(apiStatus?: string): Company['status'] {
    const s = (apiStatus ?? '').toLowerCase();
    if (s === 'approved') return 'approved';
    if (
      s === 'pending' ||
      s === 'recently_submitted' ||
      s === 'submitted' ||
      s === 'under_review'
    ) {
      return 'pending';
    }
    if (s === 'rejected' || s === 'blocked') return 'rejected';
    if (s === 'active') return 'active';
    if (s === 'inactive') return 'inactive';
    if (s === 'suspended') return 'suspended';
    return 'inactive';
  }

  mapBackendDocument(d: BackendDocumentRaw, fallbackIndex: number): CompanyDocument {
    const rawId =
      d.id !== undefined && d.id !== null
        ? String(d.id)
        : `doc-placeholder-${fallbackIndex}`;
    const fileName =
      d.file_name ?? d.fileName ?? d.name ?? 'مستند';
    const uploaded =
      d.upload_date ?? d.uploadDate ?? '';

    let statusDoc: CompanyDocument['status'] = 'pending';
    const st = (d.status ?? '').toLowerCase();
    if (st === 'completed' || st === 'approved') {
      statusDoc = 'completed';
    }

    return {
      id: rawId,
      name: d.name ?? fileName.replace(/\.[^/.]+$/, ''),
      fileName,
      uploadDate: uploaded || '-',
      status: statusDoc,
      fileUrl: d.file_url ?? d.url
    };
  }

  formatDate(iso?: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  getApiErrorMessage(error: unknown, fallback: string): string {
    return apiErrorMessage(error, fallback);
  }
}
