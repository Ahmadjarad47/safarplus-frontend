import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';

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
  private _summaryStats = signal<SuperAdminSummaryStats>({
    totalIncome: 34250000,
    totalBookings: 8246,
    totalTrips: 318,
    totalCompanies: 27
  });

  // Weekly Activity
  private _weeklyActivity = signal<WeeklyActivity[]>([
    { day: 'الأحد', value: 45 },
    { day: 'الاثنين', value: 55 },
    { day: 'الثلاثاء', value: 65 },
    { day: 'الأربعاء', value: 70 },
    { day: 'الخميس', value: 75 },
    { day: 'الجمعة', value: 80 },
    { day: 'السبت', value: 95 }
  ]);

  // Companies
  private _companies = signal<Company[]>([
    {
      id: '1',
      name: 'شركة الشريف للنقل',
      email: 'hasan.abrash32@gmail.com',
      phone: '+90654656556155',
      address: 'حلب اعزاز الكراج الرئيسي',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 150,
      totalBookings: 1200,
      documents: [
        { id: '1', name: 'سجل الشركة', fileName: 'السجل التجاري.pdf', uploadDate: '15-01-2023', status: 'completed' },
        { id: '2', name: 'رخصة التشغيل', fileName: 'رخصة_التشغيل.pdf', uploadDate: '15-01-2023', status: 'completed' },
        { id: '3', name: 'شهادة التسجيل', fileName: 'شهادة_التسجيل.pdf', uploadDate: '15-01-2023', status: 'completed' }
      ]
    },
    {
      id: '2',
      name: 'شركة البدران',
      email: 'albadran@transport.com',
      phone: '+963123456789',
      address: 'دمشق، شارع الجلاء',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 200,
      totalBookings: 1800,
      documents: []
    },
    {
      id: '3',
      name: 'شركة الزاجل',
      email: 'alzajel@transport.com',
      phone: '+963987654321',
      address: 'حلب، شارع الجامعة',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 180,
      totalBookings: 1500,
      documents: []
    },
    {
      id: '4',
      name: 'شركة الزاجل',
      email: 'alzajel2@transport.com',
      phone: '+963555444333',
      address: 'إدلب، وسط المدينة',
      status: 'blocked',
      registrationDate: '01-01-2024',
      totalTrips: 50,
      totalBookings: 400,
      documents: []
    },
    {
      id: '5',
      name: 'شركة الزاجل',
      email: 'alzajel3@transport.com',
      phone: '+963111222333',
      address: 'حمص، شارع الدبلان',
      status: 'recently_submitted',
      registrationDate: '01-01-2024',
      totalTrips: 0,
      totalBookings: 0,
      documents: []
    },
    {
      id: '6',
      name: 'شركة الزاجل',
      email: 'alzajel4@transport.com',
      phone: '+963444555666',
      address: 'اللاذقية، الكورنيش',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 120,
      totalBookings: 950,
      documents: []
    },
    {
      id: '7',
      name: 'شركة الزاجل',
      email: 'alzajel5@transport.com',
      phone: '+963777888999',
      address: 'طرطوس، الكورنيش',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 100,
      totalBookings: 800,
      documents: []
    },
    {
      id: '8',
      name: 'شركة الزاجل',
      email: 'alzajel6@transport.com',
      phone: '+963222333444',
      address: 'حماه، شارع الرئيسي',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 90,
      totalBookings: 700,
      documents: []
    },
    {
      id: '9',
      name: 'شركة الزاجل',
      email: 'alzajel7@transport.com',
      phone: '+963333444555',
      address: 'دير الزور، شارع الثورة',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 80,
      totalBookings: 600,
      documents: []
    },
    {
      id: '10',
      name: 'شركة الزاجل',
      email: 'alzajel8@transport.com',
      phone: '+963444555666',
      address: 'السويداء، شارع الرئيسي',
      status: 'recently_submitted',
      registrationDate: '01-01-2024',
      totalTrips: 0,
      totalBookings: 0,
      documents: []
    },
    {
      id: '11',
      name: 'شركة الزاجل',
      email: 'alzajel9@transport.com',
      phone: '+963555666777',
      address: 'القنيطرة، شارع الرئيسي',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 70,
      totalBookings: 500,
      documents: []
    },
    {
      id: '12',
      name: 'شركة الزاجل',
      email: 'alzajel10@transport.com',
      phone: '+963666777888',
      address: 'درعا، شارع الرئيسي',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 60,
      totalBookings: 450,
      documents: []
    }
  ]);

  // Bookings
  private _bookings = signal<Booking[]>([
    {
      id: '1',
      bookingNumber: '123123123123',
      bookingDate: '15-07-2025',
      status: 'confirmed',
      paymentMethod: 'شام كاش',
      passenger: { name: 'حسن الابرش', phone: '+963465465454', email: 'hasan.abrash32@gmail.com' },
      trip: { plan: 'إدلب - دمشق', busNumber: 'B12', tripDate: '26-07-2025', tripTime: '8:00 صباحا', companyId: '1', companyName: 'شركة النقل السريع' },
      seat: { number: 15, type: 'normal' },
      totalAmount: 150000
    },
    {
      id: '2',
      bookingNumber: '123123123124',
      bookingDate: '15-07-2025',
      status: 'canceled',
      paymentMethod: 'شام كاش',
      passenger: { name: 'حسن الابرش', phone: '+963465465454', email: 'hasan.abrash32@gmail.com' },
      trip: { plan: 'إدلب - دمشق', busNumber: 'B12', tripDate: '26-07-2025', tripTime: '8:00 صباحا', companyId: '1', companyName: 'شركة النقل السريع' },
      seat: { number: 12, type: 'normal' },
      totalAmount: 150000
    },
    {
      id: '3',
      bookingNumber: '123123123125',
      bookingDate: '15-07-2025',
      status: 'pending',
      paymentMethod: 'فاتورة',
      passenger: { name: 'حسن الابرش', phone: '+963465465454', email: 'hasan.abrash32@gmail.com' },
      trip: { plan: 'إدلب - دمشق', busNumber: 'B12', tripDate: '26-07-2025', tripTime: '8:00 صباحا', companyId: '2', companyName: 'شركة الرحلات الذهبية' },
      seat: { number: 12, type: 'normal' },
      totalAmount: 150000
    },
    {
      id: '4',
      bookingNumber: '123123123126',
      bookingDate: '15-07-2025',
      status: 'confirmed',
      paymentMethod: 'شام كاش',
      passenger: { name: 'حسن الابرش', phone: '+963465465454', email: 'hasan.abrash32@gmail.com' },
      trip: { plan: 'إدلب - دمشق', busNumber: 'B12', tripDate: '26-07-2025', tripTime: '8:00 صباحا', companyId: '1', companyName: 'شركة النقل السريع' },
      seat: { number: 12, type: 'normal' },
      totalAmount: 150000
    },
    {
      id: '5',
      bookingNumber: '123123123127',
      bookingDate: '15-07-2025',
      status: 'confirmed',
      paymentMethod: 'ام تي ان كاش',
      passenger: { name: 'أحمد حسن', phone: '+963123456789', email: 'ahmed.hassan@gmail.com' },
      trip: { plan: 'حلب - دمشق', busNumber: 'B15', tripDate: '27-07-2025', tripTime: '9:00 صباحا', companyId: '2', companyName: 'شركة الرحلات الذهبية' },
      seat: { number: 8, type: 'vip' },
      totalAmount: 200000
    }
  ]);

  // Notifications
  private _notifications = signal<Notification[]>([
    {
      id: '1',
      passengerName: 'حسن الابرش',
      passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan',
      route: 'إدلب - دمشق',
      date: '15-07-2025',
      type: 'booking'
    },
    {
      id: '2',
      passengerName: 'حسن الابرش',
      passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan2',
      route: 'إدلب - دمشق',
      date: '15-07-2025',
      type: 'booking'
    },
    {
      id: '3',
      passengerName: 'حسن الابرش',
      passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan3',
      route: 'إدلب - دمشق',
      date: '15-07-2025',
      type: 'booking'
    },
    {
      id: '4',
      passengerName: 'حسن الابرش',
      passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan4',
      route: 'إدلب - دمشق',
      date: '15-07-2025',
      type: 'booking'
    }
  ]);

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
          `${this.apiBaseUrl}/dashboard/transport-summary`,
          { headers: this.getAuthHeaders() }
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

  private getAuthHeaders(): HttpHeaders {
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('admin_token') ?? sessionStorage.getItem('admin_token')
        : null;
    let headers = new HttpHeaders({ Accept: 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
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
    this._summaryStats.set({
      totalIncome: 34250000,
      totalBookings: 8246,
      totalTrips: 318,
      totalCompanies: 27
    });

    this._weeklyActivity.set([
      { day: 'الأحد', value: 118 },
      { day: 'الاثنين', value: 142 },
      { day: 'الثلاثاء', value: 96 },
      { day: 'الأربعاء', value: 173 },
      { day: 'الخميس', value: 205 },
      { day: 'الجمعة', value: 187 },
      { day: 'السبت', value: 154 }
    ]);

    this._bookings.set([
      {
        id: 'mock-1',
        bookingNumber: 'SP-2026-1048',
        bookingDate: '26-07-2026',
        status: 'confirmed',
        paymentMethod: 'شام كاش',
        passenger: { name: 'حسن الأبرش', phone: '+963944112233', email: 'hassan@example.com' },
        trip: { plan: 'حلب - دمشق', busNumber: 'ALE-214', tripDate: '27-07-2026', tripTime: '08:30 صباحا', companyId: '1', companyName: 'شركة الشام للنقل' },
        seat: { number: 14, type: 'vip' },
        totalAmount: 185000
      },
      {
        id: 'mock-2',
        bookingNumber: 'SP-2026-1047',
        bookingDate: '26-07-2026',
        status: 'pending',
        paymentMethod: 'فاتورة',
        passenger: { name: 'مها خليل', phone: '+963955667788', email: 'maha@example.com' },
        trip: { plan: 'دمشق - اللاذقية', busNumber: 'DAM-087', tripDate: '28-07-2026', tripTime: '11:00 صباحا', companyId: '2', companyName: 'شركة الساحل السريع' },
        seat: { number: 7, type: 'normal' },
        totalAmount: 160000
      },
      {
        id: 'mock-3',
        bookingNumber: 'SP-2026-1046',
        bookingDate: '25-07-2026',
        status: 'confirmed',
        paymentMethod: 'سيرياتيل كاش',
        passenger: { name: 'عمر الحسن', phone: '+963933445566', email: 'omar@example.com' },
        trip: { plan: 'إدلب - حلب', busNumber: 'IDL-332', tripDate: '26-07-2026', tripTime: '06:45 مساء', companyId: '3', companyName: 'شركة الشمال' },
        seat: { number: 21, type: 'business' },
        totalAmount: 125000
      },
      {
        id: 'mock-4',
        bookingNumber: 'SP-2026-1045',
        bookingDate: '25-07-2026',
        status: 'canceled',
        paymentMethod: 'ام تي ان كاش',
        passenger: { name: 'نور اليوسف', phone: '+963988776655', email: 'nour@example.com' },
        trip: { plan: 'حمص - طرطوس', busNumber: 'HMS-119', tripDate: '27-07-2026', tripTime: '03:15 مساء', companyId: '4', companyName: 'شركة البدران' },
        seat: { number: 4, type: 'normal' },
        totalAmount: 95000
      },
      {
        id: 'mock-5',
        bookingNumber: 'SP-2026-1044',
        bookingDate: '24-07-2026',
        status: 'confirmed',
        paymentMethod: 'فاتورة',
        passenger: { name: 'ليلى مراد', phone: '+963922334455', email: 'layla@example.com' },
        trip: { plan: 'دمشق - درعا', busNumber: 'DRA-506', tripDate: '26-07-2026', tripTime: '01:00 مساء', companyId: '5', companyName: 'شركة الجنوب' },
        seat: { number: 18, type: 'normal' },
        totalAmount: 80000
      },
      {
        id: 'mock-6',
        bookingNumber: 'SP-2026-1043',
        bookingDate: '24-07-2026',
        status: 'confirmed',
        paymentMethod: 'شام كاش',
        passenger: { name: 'سارة ديب', phone: '+963911223344', email: 'sara@example.com' },
        trip: { plan: 'اللاذقية - حلب', busNumber: 'LAT-441', tripDate: '29-07-2026', tripTime: '09:30 مساء', companyId: '2', companyName: 'شركة الساحل السريع' },
        seat: { number: 2, type: 'vip' },
        totalAmount: 210000
      }
    ]);

    this._notifications.set([
      {
        id: 'mock-notification-1',
        passengerName: 'حسن الأبرش',
        passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan',
        route: 'حجز جديد: حلب - دمشق',
        date: 'منذ 5 دقائق',
        type: 'booking'
      },
      {
        id: 'mock-notification-2',
        passengerName: 'مها خليل',
        passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maha',
        route: 'دفعة بانتظار التأكيد',
        date: 'منذ 18 دقيقة',
        type: 'payment'
      },
      {
        id: 'mock-notification-3',
        passengerName: 'نور اليوسف',
        passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nour',
        route: 'شكوى على رحلة حمص - طرطوس',
        date: 'منذ ساعة',
        type: 'complaint'
      },
      {
        id: 'mock-notification-4',
        passengerName: 'عمر الحسن',
        passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar',
        route: 'حجز مؤكد: إدلب - حلب',
        date: 'اليوم',
        type: 'booking'
      }
    ]);

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



