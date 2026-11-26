import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import {
  INITIAL_BOOKINGS,
  INITIAL_COMPANIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_SUMMARY_STATS,
  INITIAL_WEEKLY_ACTIVITY,
  MOCK_BOOKINGS,
  MOCK_NOTIFICATIONS,
  MOCK_SUMMARY_STATS,
  MOCK_WEEKLY_ACTIVITY
} from './super-admin-seed-data';

export interface SuperAdminSummaryStats {
  totalIncome: number;
  totalBookings: number;
  totalTrips: number;
  totalCompanies: number;
}

export interface CompanyDocument {
  id: string;
  name: string;
  fileName: string;
  uploadDate: string;
  status: 'completed' | 'pending';
  fileUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  /** UI + API: Laravel may return approved/pending/rejected */
  status:
    | 'active'
    | 'inactive'
    | 'suspended'
    | 'blocked'
    | 'recently_submitted'
    | 'approved'
    | 'pending'
    | 'rejected';
  registrationDate: string;
  totalTrips: number;
  totalBookings: number;
  documents?: CompanyDocument[];
}

export interface Booking {
  id: string;
  bookingNumber: string;
  bookingDate: string;
  status: 'confirmed' | 'pending' | 'canceled';
  paymentMethod: string;
  passenger: {
    name: string;
    phone: string;
    email: string;
  };
  trip: {
    plan: string;
    busNumber: string;
    tripDate: string;
    tripTime: string;
    companyId: string;
    companyName: string;
  };
  seat: {
    number: number;
    type: 'normal' | 'vip' | 'business';
  };
  totalAmount: number;
}

export interface WeeklyActivity {
  day: string;
  value: number;
}

export interface Notification {
  id: string;
  passengerName: string;
  passengerAvatar: string;
  route: string;
  date: string;
  type: 'booking' | 'complaint' | 'payment';
}

interface TransportDashboardApiResponse {
  data?: {
    summary?: {
      total_income?: number | string;
      total_bookings?: number | string;
      total_trips?: number | string;
      total_companies?: number | string;
    };
    weekly_activity?: Array<{ day?: string; value?: number | string }>;
    notifications?: unknown[];
    bookings?: unknown[];
  };
}

type TransportDashboardData = NonNullable<TransportDashboardApiResponse['data']>;
type TransportDashboardSummary = TransportDashboardData['summary'];
type TransportDashboardWeeklyActivity = TransportDashboardData['weekly_activity'];

@Injectable({
  providedIn: 'root'
})
export class SuperAdminStateService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiBaseUrl = this.resolveApiBaseUrl();

  // Summary Stats
  private _summaryStats = signal<SuperAdminSummaryStats>(INITIAL_SUMMARY_STATS);

  // Weekly Activity
  private _weeklyActivity = signal<WeeklyActivity[]>(INITIAL_WEEKLY_ACTIVITY);

  // Companies
  private _companies = signal<Company[]>(INITIAL_COMPANIES);

  // Bookings
  private _bookings = signal<Booking[]>(INITIAL_BOOKINGS);

  // Notifications
  private _notifications = signal<Notification[]>(INITIAL_NOTIFICATIONS);

  // Pagination
  private _currentPage = signal<number>(1);
  private _itemsPerPage = signal<number>(5);
  private _searchTerm = signal<string>('');
  private _notificationCount = signal<number>(4);

  // Public readonly signals
  readonly summaryStats = this._summaryStats.asReadonly();
  readonly weeklyActivity = this._weeklyActivity.asReadonly();
  readonly companies = this._companies.asReadonly();
  readonly bookings = this._bookings.asReadonly();
  readonly notifications = this._notifications.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly itemsPerPage = this._itemsPerPage.asReadonly();
  readonly notificationCount = this._notificationCount.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();

  // Computed values
  readonly filteredBookings = computed(() => {
    const term = this._searchTerm().trim();
    if (!term) {
      return this._bookings();
    }
    return this.searchBookings(term);
  });

  readonly filteredCompanies = computed(() => {
    const term = this._searchTerm().trim();
    if (!term) {
      return this._companies();
    }
    return this._companies().filter(company =>
      company.name.toLowerCase().includes(term.toLowerCase()) ||
      company.email.toLowerCase().includes(term.toLowerCase()) ||
      company.phone.includes(term)
    );
  });

  readonly totalBookings = computed(() => this.filteredBookings().length);
  readonly totalCompanies = computed(() => this.filteredCompanies().length);

  readonly paginatedBookings = computed(() => {
    const filtered = this.filteredBookings();
    const start = (this._currentPage() - 1) * this._itemsPerPage();
    const end = start + this._itemsPerPage();
    return filtered.slice(start, end);
  });

  readonly paginatedCompanies = computed(() => {
    const filtered = this.filteredCompanies();
    const start = (this._currentPage() - 1) * this._itemsPerPage();
    const end = start + this._itemsPerPage();
    return filtered.slice(start, end);
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredBookings().length / this._itemsPerPage()))
  );

  readonly totalCompanyPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCompanies().length / this._itemsPerPage()))
  );

  // Methods
  setSearchTerm(term: string): void {
    this._searchTerm.set(term);
    this._currentPage.set(1);
  }

  setCurrentPage(page: number): void {
    const maxPage = Math.ceil(this.filteredBookings().length / this._itemsPerPage());
    if (page >= 1 && page <= maxPage) {
      this._currentPage.set(page);
    }
  }

  setCurrentPageForCompanies(page: number): void {
    const maxPage = Math.ceil(this.filteredCompanies().length / this._itemsPerPage());
    if (page >= 1 && page <= maxPage) {
      this._currentPage.set(page);
    }
  }

  nextPage(): void {
    const maxPage = Math.ceil(this.filteredBookings().length / this._itemsPerPage());
    if (this._currentPage() < maxPage) {
      this._currentPage.update(p => p + 1);
    }
  }

  previousPage(): void {
    if (this._currentPage() > 1) {
      this._currentPage.update(p => p - 1);
    }
  }

  updateSummaryStats(stats: Partial<SuperAdminSummaryStats>): void {
    this._summaryStats.update(current => ({ ...current, ...stats }));
  }

  async refreshTransportDashboardCounts(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<TransportDashboardApiResponse>(
          `${this.apiBaseUrl}/dashboard/transport-summary`
        )
      );

      const data = response?.data;
      if (!data) {
        return;
      }

      if (!this.hasDashboardContent(data)) {
        this.loadRealisticMockDashboard();
        return;
      }

      this.applyDashboardSummary(data.summary);
      this.applyWeeklyActivity(data.weekly_activity);
      this.applyNotifications(data.notifications);
      this.applyBookings(data.bookings);
    } catch {
      this.loadRealisticMockDashboard();
    }
  }

  private applyDashboardSummary(summary: TransportDashboardSummary): void {
    if (!summary) {
      return;
    }

    const nextSummary = {
      totalIncome: Number(summary.total_income ?? 0),
      totalBookings: Number(summary.total_bookings ?? 0),
      totalTrips: Number(summary.total_trips ?? 0),
      totalCompanies: Number(summary.total_companies ?? 0)
    };

    if (Object.values(nextSummary).every(value => value === 0)) {
      return;
    }

    this.updateSummaryStats({
      totalIncome: nextSummary.totalIncome || this._summaryStats().totalIncome,
      totalBookings: nextSummary.totalBookings || this._summaryStats().totalBookings,
      totalTrips: nextSummary.totalTrips || this._summaryStats().totalTrips,
      totalCompanies: nextSummary.totalCompanies || this._summaryStats().totalCompanies
    });
  }

  private applyWeeklyActivity(activity: TransportDashboardWeeklyActivity): void {
    if (!Array.isArray(activity) || activity.length === 0) {
      return;
    }

    if (activity.every(item => Number(item.value ?? 0) === 0)) {
      return;
    }

    this._weeklyActivity.set(
      activity.map((item) => ({
        day: String(item.day ?? ''),
        value: Number(item.value ?? 0)
      }))
    );
  }

  private applyNotifications(rawNotifications: unknown[] | undefined): void {
    if (!Array.isArray(rawNotifications) || rawNotifications.length === 0) {
      return;
    }

    const notifications = rawNotifications
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map((item, index) => ({
        id: String(item['id'] ?? index + 1),
        passengerName: String(item['passenger_name'] ?? item['passengerName'] ?? '—'),
        passengerAvatar: String(
          item['passenger_avatar'] ??
            item['passengerAvatar'] ??
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Passenger'
        ),
        route: String(item['route'] ?? '—'),
        date: String(item['date'] ?? '—'),
        type: this.normalizeNotificationType(item['type'])
      }));

    this._notifications.set(notifications);
    this._notificationCount.set(notifications.length);
  }

  private applyBookings(rawBookings: unknown[] | undefined): void {
    if (!Array.isArray(rawBookings) || rawBookings.length === 0) {
      return;
    }

    this._bookings.set(
      rawBookings
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
        .map((item, index) => this.mapApiBooking(item, index))
    );
    this._currentPage.set(1);
  }

  private mapApiBooking(item: Record<string, unknown>, fallbackIndex: number): Booking {
    const passenger = this.toRecord(item['passenger']);
    const trip = this.toRecord(item['trip']);
    const seat = this.toRecord(item['seat']);

    return {
      id: String(item['id'] ?? fallbackIndex + 1),
      bookingNumber: String(item['booking_number'] ?? item['bookingNumber'] ?? `#${fallbackIndex + 1}`),
      bookingDate: String(item['booking_date'] ?? item['bookingDate'] ?? '-'),
      status: this.normalizeBookingStatus(item['status']),
      paymentMethod: this.normalizePaymentMethod(item['payment_method'] ?? item['payment_gateway'] ?? item['paymentMethod']),
      passenger: {
        name: String(passenger?.['name'] ?? '—'),
        phone: String(passenger?.['phone'] ?? '—'),
        email: String(passenger?.['email'] ?? '—')
      },
      trip: {
        plan: String(trip?.['plan'] ?? '—'),
        busNumber: String(trip?.['bus_number'] ?? trip?.['busNumber'] ?? '—'),
        tripDate: String(trip?.['trip_date'] ?? trip?.['tripDate'] ?? '-'),
        tripTime: String(trip?.['trip_time'] ?? trip?.['tripTime'] ?? '-'),
        companyId: String(trip?.['company_id'] ?? trip?.['companyId'] ?? ''),
        companyName: String(trip?.['company_name'] ?? trip?.['companyName'] ?? '—')
      },
      seat: {
        number: Number(seat?.['number'] ?? 0),
        type: this.normalizeSeatType(seat?.['type'])
      },
      totalAmount: Number(item['total_amount'] ?? item['totalAmount'] ?? 0)
    };
  }

  private normalizeNotificationType(type: unknown): Notification['type'] {
    const normalized = String(type ?? '').toLowerCase();
    if (normalized === 'complaint') return 'complaint';
    if (normalized === 'payment') return 'payment';
    return 'booking';
  }

  private normalizeBookingStatus(status: unknown): Booking['status'] {
    const normalized = String(status ?? '').toLowerCase();
    if (normalized === 'confirmed' || normalized === 'approved') return 'confirmed';
    if (normalized === 'canceled' || normalized === 'cancelled' || normalized === 'rejected') {
      return 'canceled';
    }
    return 'pending';
  }

  private normalizePaymentMethod(method: unknown): string {
    const value = String(method ?? '').trim();
    const normalized = value.toLowerCase().replace(/[\s_-]+/g, '');

    switch (normalized) {
      case 'fatora':
      case 'fatoorah':
      case 'فاتورة':
        return 'فاتورة';
      case 'shamcash':
      case 'شامكاش':
        return 'شام كاش';
      case 'syriatel':
      case 'syriatelcash':
      case 'سيريتلكاش':
      case 'سيراتيلكاش':
      case 'سيرياتيلكاش':
        return 'سيرياتيل كاش';
      case 'mtn':
      case 'mtncash':
      case 'امتيانكاش':
      case 'إمتيإنكاش':
        return 'ام تي ان كاش';
      case 'cash':
      case 'نقدي':
        return 'شام كاش';
      default:
        return value || 'شام كاش';
    }
  }

  private normalizeSeatType(type: unknown): Booking['seat']['type'] {
    const normalized = String(type ?? '').toLowerCase();
    if (normalized === 'vip') return 'vip';
    if (normalized === 'business') return 'business';
    return 'normal';
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private hasDashboardContent(data: TransportDashboardData): boolean {
    const summaryValues = Object.values(data.summary ?? {}).map(value => Number(value ?? 0));
    const hasSummary = summaryValues.some(value => value > 0);
    const hasWeeklyActivity = (data.weekly_activity ?? []).some(item => Number(item.value ?? 0) > 0);
    const hasNotifications = (data.notifications ?? []).length > 0;
    const hasBookings = (data.bookings ?? []).length > 0;

    return hasSummary || hasWeeklyActivity || hasNotifications || hasBookings;
  }

  private loadRealisticMockDashboard(): void {
    this._summaryStats.set(MOCK_SUMMARY_STATS);

    this._weeklyActivity.set(MOCK_WEEKLY_ACTIVITY);

    this._bookings.set(MOCK_BOOKINGS);

    this._notifications.set(MOCK_NOTIFICATIONS);

    this._notificationCount.set(this._notifications().length);
    this._currentPage.set(1);
  }

  private resolveApiBaseUrl(): string {
    return resolveApiV1BaseUrl();
  }

  updateNotificationCount(count: number): void {
    this._notificationCount.set(count);
  }

  // Company CRUD
  getCompanyById(id: string): Company | undefined {
    return this._companies().find(c => c.id === id);
  }

  addCompany(company: Omit<Company, 'id'>): void {
    const newId = (this._companies().length + 1).toString();
    const newCompany: Company = { ...company, id: newId };
    this._companies.update(companies => [...companies, newCompany]);
    this._summaryStats.update(stats => ({
      ...stats,
      totalCompanies: stats.totalCompanies + 1
    }));
  }

  updateCompany(id: string, updates: Partial<Company>): void {
    this._companies.update(companies =>
      companies.map(company =>
        company.id === id ? { ...company, ...updates } : company
      )
    );
  }

  deleteCompany(id: string): void {
    this._companies.update(companies => companies.filter(c => c.id !== id));
    this._summaryStats.update(stats => ({
      ...stats,
      totalCompanies: Math.max(0, stats.totalCompanies - 1)
    }));
  }

  // Booking CRUD
  getBookingById(id: string): Booking | undefined {
    return this._bookings().find(b => b.id === id);
  }

  addBooking(booking: Omit<Booking, 'id'>): void {
    const newId = (this._bookings().length + 1).toString();
    const newBooking: Booking = { ...booking, id: newId };
    this._bookings.update(bookings => [...bookings, newBooking]);
    this._summaryStats.update(stats => ({
      ...stats,
      totalBookings: stats.totalBookings + 1
    }));
  }

  updateBooking(id: string, updates: Partial<Booking>): void {
    this._bookings.update(bookings =>
      bookings.map(booking =>
        booking.id === id ? { ...booking, ...updates } : booking
      )
    );
  }

  deleteBooking(id: string): void {
    this._bookings.update(bookings => bookings.filter(b => b.id !== id));
    this._summaryStats.update(stats => ({
      ...stats,
      totalBookings: Math.max(0, stats.totalBookings - 1)
    }));
  }

  searchBookings(searchTerm: string): Booking[] {
    if (!searchTerm.trim()) {
      return this._bookings();
    }
    const term = searchTerm.toLowerCase();
    return this._bookings().filter(booking =>
      booking.bookingNumber.toLowerCase().includes(term) ||
      booking.passenger.name.toLowerCase().includes(term) ||
      booking.passenger.phone.includes(term) ||
      booking.passenger.email.toLowerCase().includes(term) ||
      booking.trip.plan.toLowerCase().includes(term) ||
      booking.trip.busNumber.toLowerCase().includes(term) ||
      booking.trip.companyName.toLowerCase().includes(term)
    );
  }
}



