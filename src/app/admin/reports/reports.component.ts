import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

export interface Report {
  id: string;
  title: string;
  type: string;
  generatedDate: string;
  period: string;
  status: 'ready' | 'generating';
  destination?: string;
  fromDestination?: string;
  toDestination?: string;
  fromDate?: string;
  toDate?: string;
}

interface RecentBookingRow {
  id: string;
  bookingNumber: string;
  status: string;
  totalAmount: number;
  passenger: { name: string };
  trip: { plan: string; tripDate: string };
}

interface FinancialStats {
  fromDate: string;
  toDate: string;
  grossRevenue: number;
  platformCommission: number;
  netProfit: number;
  paidBookings: number;
  cancelledBookings: number;
  cancelledAmount: number;
  averageTicket: number;
  cancellationRate: number;
}

interface MonthlyFinancialRow {
  month: string;
  revenue: number;
  commission: number;
  netProfit: number;
  cancelledBookings: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  showCreateModal = signal(false);
  editingReport: Report | null = null;
  readonly isLoading = signal(false);
  readonly apiError = signal('');

  reportFormData = {
    destination: 'all',
    fromDestination: 'إدلب',
    toDestination: 'دمشق',
    fromDate: '',
    toDate: ''
  };

  reports = signal<Report[]>([]);
  dashboardStats = signal({
    totalTickets: 0,
    confirmedBookings: 0,
    totalTrips: 0,
    pendingPayments: 0,
    receivedPayments: 0,
    totalRevenue: 0
  });

  readonly monthlyRevenue = signal<{ month: string; revenue: number }[]>([]);
  readonly monthlyBookings = signal<{ month: string; bookings: number }[]>([]);
  readonly recentBookings = signal<RecentBookingRow[]>([]);
  readonly financialStats = signal<FinancialStats>({
    fromDate: this.dateOffset(-30),
    toDate: this.dateOffset(0),
    grossRevenue: 0,
    platformCommission: 0,
    netProfit: 0,
    paidBookings: 0,
    cancelledBookings: 0,
    cancelledAmount: 0,
    averageTicket: 0,
    cancellationRate: 0
  });
  readonly monthlyFinancial = signal<MonthlyFinancialRow[]>([]);

  financialFilter = {
    fromDate: this.dateOffset(-30),
    toDate: this.dateOffset(0)
  };

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadSummary(), this.loadReports()]);
  }

  readonly maxRevenue = computed(() => Math.max(...this.monthlyRevenue().map((m) => m.revenue), 1));
  readonly maxBookings = computed(() => Math.max(...this.monthlyBookings().map((m) => m.bookings), 1));

  readonly revenueBars = computed(() => {
    const max = this.maxRevenue();
    return this.monthlyRevenue().map((m) => ({
      ...m,
      height: max > 0 ? (m.revenue / max) * 100 : 0
    }));
  });

  readonly bookingBars = computed(() => {
    const max = this.maxBookings();
    return this.monthlyBookings().map((m) => ({
      ...m,
      height: max > 0 ? (m.bookings / max) * 100 : 0
    }));
  });

  readonly maxNetProfit = computed(() => Math.max(...this.monthlyFinancial().map((m) => m.netProfit), 1));
  readonly netProfitBars = computed(() => {
    const max = this.maxNetProfit();
    return this.monthlyFinancial().map((m) => ({
      ...m,
      height: max > 0 ? (m.netProfit / max) * 100 : 0
    }));
  });

  async applyFinancialFilter(): Promise<void> {
    await this.loadSummary();
  }

  statusBadgeClass(status: string) {
    switch (status) {
      case 'confirmed':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'canceled':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }

  statusText(status: string) {
    switch (status) {
      case 'confirmed':
        return 'مؤكد';
      case 'pending':
        return 'قيد الانتظار';
      case 'canceled':
        return 'ملغي';
      default:
        return status;
    }
  }

  reportStatusClass(status: string) {
    switch (status) {
      case 'ready':
        return 'badge-success';
      case 'generating':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  }

  reportStatusText(status: string) {
    switch (status) {
      case 'ready':
        return 'جاهز';
      case 'generating':
        return 'قيد الإنشاء';
      default:
        return status;
    }
  }

  openCreateModal() {
    this.editingReport = null;
    this.reportFormData = {
      destination: 'all',
      fromDestination: 'إدلب',
      toDestination: 'دمشق',
      fromDate: '',
      toDate: ''
    };
    this.showCreateModal.set(true);
  }

  editReport(report: Report) {
    this.editingReport = report;
    this.reportFormData = {
      destination: report.destination || 'all',
      fromDestination: report.fromDestination || 'إدلب',
      toDestination: report.toDestination || 'دمشق',
      fromDate: this.displayDateToYmd(report.fromDate || ''),
      toDate: this.displayDateToYmd(report.toDate || '')
    };
    this.showCreateModal.set(true);
  }

  deleteReport(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا التقرير؟')) {
      return;
    }

    void this.deleteReportFromApi(id);
  }

  async generateReport() {
    try {
      if (this.editingReport) {
        await firstValueFrom(
          this.http.post(
            `${this.apiBaseUrl}/transport/reports/${this.editingReport.id}`,
            this.buildReportPayload(),
            this.getRequestOptions()
          )
        );
      } else {
        await firstValueFrom(
          this.http.post(
            `${this.apiBaseUrl}/transport/reports`,
            this.buildReportPayload(),
            this.getRequestOptions()
          )
        );
      }

      await Promise.all([this.loadReports(), this.loadSummary()]);
      this.closeCreateModal();
    } catch (error) {
      this.apiError.set(this.getApiErrorMessage(error, 'فشل حفظ التقرير.'));
    }
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.editingReport = null;
  }

  exportToExcel() {
    this.downloadBlob(
      JSON.stringify({
        stats: this.dashboardStats(),
        financialStats: this.financialStats(),
        monthlyFinancial: this.monthlyFinancial(),
        reports: this.reports(),
        bookings: this.recentBookings()
      }, null, 2),
      'transport-report.json',
      'application/json'
    );
  }

  exportToPDF() {
    this.downloadBlob(
      [
        'Transport Report Summary',
        `Total tickets: ${this.dashboardStats().totalTickets}`,
        `Confirmed bookings: ${this.dashboardStats().confirmedBookings}`,
        `Total trips: ${this.dashboardStats().totalTrips}`,
        `Total revenue: ${this.dashboardStats().totalRevenue}`,
        `Period gross revenue: ${this.financialStats().grossRevenue}`,
        `Platform commission: ${this.financialStats().platformCommission}`,
        `Net profit: ${this.financialStats().netProfit}`,
        `Cancelled bookings: ${this.financialStats().cancelledBookings}`
      ].join('\n'),
      'transport-report.txt',
      'text/plain;charset=utf-8'
    );
  }

  downloadReport(report: Report) {
    this.downloadBlob(JSON.stringify(report, null, 2), `report-${report.id}.json`, 'application/json');
  }

  private async loadSummary(): Promise<void> {
    this.isLoading.set(true);
    this.apiError.set('');

    try {
      const response = await firstValueFrom(
        this.http.get<{
          data?: {
            dashboard_stats?: Record<string, number>;
            monthly_revenue?: Array<{ month?: string; revenue?: number }>;
            monthly_bookings?: Array<{ month?: string; bookings?: number }>;
            monthly_financial?: Array<{
              month?: string;
              revenue?: number;
              commission?: number;
              net_profit?: number;
              cancelled_bookings?: number;
            }>;
            financial_stats?: {
              from_date?: string;
              to_date?: string;
              gross_revenue?: number;
              platform_commission?: number;
              net_profit?: number;
              paid_bookings?: number;
              cancelled_bookings?: number;
              cancelled_amount?: number;
              average_ticket?: number;
              cancellation_rate?: number;
            };
            recent_bookings?: Array<Record<string, unknown>>;
          };
        }>(`${this.apiBaseUrl}/transport/reports/summary`, {
          ...this.getRequestOptions(),
          params: {
            from_date: this.financialFilter.fromDate,
            to_date: this.financialFilter.toDate
          }
        })
      );

      const data = response.data;
      const financial = data?.financial_stats;
      this.dashboardStats.set({
        totalTickets: Number(data?.dashboard_stats?.['total_tickets'] ?? 0),
        confirmedBookings: Number(data?.dashboard_stats?.['confirmed_bookings'] ?? 0),
        totalTrips: Number(data?.dashboard_stats?.['total_trips'] ?? 0),
        pendingPayments: Number(data?.dashboard_stats?.['pending_payments'] ?? 0),
        receivedPayments: Number(data?.dashboard_stats?.['received_payments'] ?? 0),
        totalRevenue: Number(data?.dashboard_stats?.['total_revenue'] ?? 0)
      });

      this.financialStats.set({
        fromDate: String(financial?.from_date ?? this.financialFilter.fromDate),
        toDate: String(financial?.to_date ?? this.financialFilter.toDate),
        grossRevenue: Number(financial?.gross_revenue ?? 0),
        platformCommission: Number(financial?.platform_commission ?? 0),
        netProfit: Number(financial?.net_profit ?? 0),
        paidBookings: Number(financial?.paid_bookings ?? 0),
        cancelledBookings: Number(financial?.cancelled_bookings ?? 0),
        cancelledAmount: Number(financial?.cancelled_amount ?? 0),
        averageTicket: Number(financial?.average_ticket ?? 0),
        cancellationRate: Number(financial?.cancellation_rate ?? 0)
      });

      this.monthlyFinancial.set(
        (data?.monthly_financial ?? []).map((item) => ({
          month: String(item.month ?? ''),
          revenue: Number(item.revenue ?? 0),
          commission: Number(item.commission ?? 0),
          netProfit: Number(item.net_profit ?? 0),
          cancelledBookings: Number(item.cancelled_bookings ?? 0)
        }))
      );

      this.monthlyRevenue.set(
        (data?.monthly_revenue ?? []).map((item) => ({
          month: String(item.month ?? ''),
          revenue: Number(item.revenue ?? 0)
        }))
      );

      this.monthlyBookings.set(
        (data?.monthly_bookings ?? []).map((item) => ({
          month: String(item.month ?? ''),
          bookings: Number(item.bookings ?? 0)
        }))
      );

      this.recentBookings.set(
        (data?.recent_bookings ?? []).map((item) => ({
          id: String(item['id'] ?? ''),
          bookingNumber: String(item['booking_number'] ?? ''),
          status: String(item['status'] ?? 'pending'),
          totalAmount: Number(item['total_amount'] ?? 0),
          passenger: {
            name: String(((item['passenger'] as Record<string, unknown> | undefined)?.['name']) ?? '—')
          },
          trip: {
            plan: String(((item['trip'] as Record<string, unknown> | undefined)?.['plan']) ?? '—'),
            tripDate: String(((item['trip'] as Record<string, unknown> | undefined)?.['trip_date']) ?? '—')
          }
        }))
      );
    } catch (error) {
      this.apiError.set(this.getApiErrorMessage(error, 'فشل تحميل بيانات التقارير.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadReports(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data?: { reports?: Array<Record<string, unknown>> } }>(
          `${this.apiBaseUrl}/transport/reports`,
          this.getRequestOptions()
        )
      );

      this.reports.set(
        (response.data?.reports ?? []).map((item) => ({
          id: String(item['id'] ?? ''),
          title: String(item['title'] ?? ''),
          type: String(item['type'] ?? ''),
          generatedDate: String(item['generated_date'] ?? '—'),
          period: String(item['period'] ?? '—'),
          status: String(item['status'] ?? 'ready') as 'ready' | 'generating',
          destination: String(item['destination'] ?? 'all'),
          fromDestination: String(item['from_destination'] ?? ''),
          toDestination: String(item['to_destination'] ?? ''),
          fromDate: String(item['from_date'] ?? ''),
          toDate: String(item['to_date'] ?? '')
        }))
      );
    } catch (error) {
      this.apiError.set(this.getApiErrorMessage(error, 'فشل تحميل قائمة التقارير.'));
    }
  }

  private buildReportPayload() {
    const today = new Date().toISOString().slice(0, 10);
    const fromDate = this.reportFormData.fromDate || null;
    const toDate = this.reportFormData.toDate || null;

    return {
      title: `تقرير ${this.reportFormData.destination === 'all' ? 'الشامل' : this.reportFormData.destination}`,
      type: 'مالي',
      generated_date: today,
      period: fromDate && toDate ? `${fromDate} إلى ${toDate}` : 'الحالي',
      status: 'ready',
      destination: this.reportFormData.destination,
      from_destination: this.reportFormData.fromDestination,
      to_destination: this.reportFormData.toDestination,
      from_date: fromDate,
      to_date: toDate
    };
  }

  private async deleteReportFromApi(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/transport/reports/${id}`, this.getRequestOptions())
      );
      await this.loadReports();
    } catch (error) {
      this.apiError.set(this.getApiErrorMessage(error, 'فشل حذف التقرير.'));
    }
  }

  private displayDateToYmd(value: string): string {
    const parts = value.split('-');
    if (parts.length === 3 && parts[0].length === 2) {
      const [day, month, year] = parts;
      return `${year}-${month}-${day}`;
    }
    return value;
  }

  private downloadBlob(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private dateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private getRequestOptions() {
    return {
      headers: this.getAuthHeaders()
    };
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token') ?? sessionStorage.getItem('admin_token');
    let headers = new HttpHeaders({ Accept: 'application/json' });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private getApiErrorMessage(error: unknown, fallback: string): string {
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

  Math = Math;
}
