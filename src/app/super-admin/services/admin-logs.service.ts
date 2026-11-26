import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';

export type AdminLogLevel =
  | 'emergency'
  | 'alert'
  | 'critical'
  | 'error'
  | 'warning'
  | 'notice'
  | 'info'
  | 'debug';

export interface AdminLogEntry {
  id: string;
  timestamp: string;
  environment: string;
  level: AdminLogLevel;
  message: string;
  context: string;
}

export interface AdminLogSummary {
  total: number;
  byLevel: Record<AdminLogLevel, number>;
}

interface BackendLogResponse {
  data?: {
    entries?: BackendLogEntry[];
    summary?: BackendLogSummary;
    file?: string;
  };
}

interface BackendLogSummary {
  total?: number;
  by_level?: Partial<Record<AdminLogLevel, number>>;
}

interface BackendLogEntry {
  id?: string;
  timestamp?: string;
  environment?: string;
  level?: string;
  message?: string;
  context?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminLogsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  async fetchLogs(params: { level?: string; search?: string; limit?: number }): Promise<{
    entries: AdminLogEntry[];
    summary: AdminLogSummary;
    file: string;
  }> {
    let httpParams = new HttpParams().set('limit', String(params.limit ?? 150));
    if (params.level && params.level !== 'all') {
      httpParams = httpParams.set('level', params.level);
    }
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    const response = await firstValueFrom(
      this.http.get<BackendLogResponse>(`${this.apiBaseUrl}/admin/logs`, {
        headers: this.getAuthHeaders(),
        params: httpParams,
      })
    );

    const entries = (response.data?.entries ?? []).map((entry, index) => this.mapEntry(entry, index));

    return {
      entries,
      summary: this.mapSummary(response.data?.summary, entries),
      file: response.data?.file ?? 'laravel.log',
    };
  }

  mockLogs(): { entries: AdminLogEntry[]; summary: AdminLogSummary; file: string } {
    const entries: AdminLogEntry[] = [
      {
        id: 'mock-log-1',
        timestamp: '2026-07-26 19:18:12',
        environment: 'local',
        level: 'error',
        message: 'No transport company is associated with this account.',
        context: 'CompanySettingsController@show rejected a settings read before fallback handling was added.',
      },
      {
        id: 'mock-log-2',
        timestamp: '2026-07-26 19:15:44',
        environment: 'local',
        level: 'warning',
        message: 'Dashboard API returned empty metrics; mock fallback data was displayed.',
        context: 'SuperAdminStateService kept the demo dashboard populated while backend data is empty.',
      },
      {
        id: 'mock-log-3',
        timestamp: '2026-07-26 19:11:02',
        environment: 'local',
        level: 'info',
        message: 'Super admin user management route loaded.',
        context: 'GET /super-admin/users rendered with mock rows because no backend users were returned.',
      },
      {
        id: 'mock-log-4',
        timestamp: '2026-07-26 19:04:31',
        environment: 'local',
        level: 'debug',
        message: 'Compiled Angular route chunk for settings-component.',
        context: 'Lazy route /super-admin/settings built successfully.',
      },
    ];

    return {
      entries,
      summary: this.mapSummary(undefined, entries),
      file: 'mock://laravel.log',
    };
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
      return 'غير مصرح لك بقراءة السجلات.';
    }

    return fallback;
  }

  private mapEntry(entry: BackendLogEntry, index: number): AdminLogEntry {
    return {
      id: entry.id ?? `log-${index}`,
      timestamp: entry.timestamp ?? '-',
      environment: entry.environment ?? '-',
      level: this.normalizeLevel(entry.level),
      message: entry.message ?? '',
      context: entry.context ?? '',
    };
  }

  private mapSummary(summary: BackendLogSummary | undefined, entries: AdminLogEntry[]): AdminLogSummary {
    const byLevel = this.emptyCounts();
    for (const entry of entries) {
      byLevel[entry.level] += 1;
    }

    const backendCounts =
      summary && typeof summary === 'object' && 'by_level' in summary
        ? (summary.by_level as Partial<Record<AdminLogLevel, number>>)
        : undefined;

    return {
      total:
        summary && typeof summary === 'object' && 'total' in summary && typeof summary.total === 'number'
          ? summary.total
          : entries.length,
      byLevel: backendCounts ? { ...byLevel, ...backendCounts } : byLevel,
    };
  }

  private emptyCounts(): Record<AdminLogLevel, number> {
    return {
      emergency: 0,
      alert: 0,
      critical: 0,
      error: 0,
      warning: 0,
      notice: 0,
      info: 0,
      debug: 0,
    };
  }

  private normalizeLevel(level?: string): AdminLogLevel {
    const normalized = String(level ?? '').toLowerCase();
    if (['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'].includes(normalized)) {
      return normalized as AdminLogLevel;
    }

    return 'info';
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token') ?? sessionStorage.getItem('admin_token');
    let headers = new HttpHeaders({ Accept: 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
