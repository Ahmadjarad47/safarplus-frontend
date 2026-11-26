import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';

export interface Booking {
  id: string;
  bookingNumber: string;
  bookingDate: string;
  status: 'confirmed' | 'pending' | 'canceled';
  paymentMethod: string;
  /** Raw API value e.g. paid, unpaid — optional for mocked rows */
  paymentStatus?: string;
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
  };
  seat: {
    number: number;
    type: 'normal' | 'vip' | 'business';
  };
  totalAmount: number;
}

export interface SummaryStats {
  todayEarnings: number;
  totalPassengers: number;
  totalTrips: number;
}

export interface WeeklyActivity {
  day: string;
  value: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminStateService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  // Summary Stats
  private _summaryStats = signal<SummaryStats>({
    todayEarnings: 1500000,
    totalPassengers: 1250,
    totalTrips: 1250
  });

  // Weekly Activity
  private _weeklyActivity = signal<WeeklyActivity[]>([
    { day: 'Monday', value: 85 },
    { day: 'Tuesday', value: 65 },
    { day: 'Wednesday', value: 70 },
    { day: 'Thursday', value: 75 },
    { day: 'Friday', value: 80 },
    { day: 'Saturday', value: 90 },
    { day: 'Sunday', value: 60 }
  ]);

  // Bookings — populated via GET /transport/bookings from Admin bookings screen
  private _bookings = signal<Booking[]>([]);

  // Pagination
  private _currentPage = signal<number>(1);
  private _itemsPerPage = signal<number>(5);
  private _searchTerm = signal<string>('');

  // Notifications
  private _notificationCount = signal<number>(1);

  // Sidebar state
  private _sidebarOpen = signal<boolean>(true);

  // Public readonly signals
  readonly summaryStats = this._summaryStats.asReadonly();
  readonly weeklyActivity = this._weeklyActivity.asReadonly();
  readonly bookings = this._bookings.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly itemsPerPage = this._itemsPerPage.asReadonly();
  readonly notificationCount = this._notificationCount.asReadonly();
  readonly sidebarOpen = this._sidebarOpen.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();

  // Computed values
  readonly filteredBookings = computed(() => {
    const term = this._searchTerm().trim();
    if (!term) {
      return this._bookings();
    }
    return this.searchBookings(term);
  });
  
  readonly totalBookings = computed(() => this.filteredBookings().length);
  
  readonly paginatedBookings = computed(() => {
    const filtered = this.filteredBookings();
    const start = (this._currentPage() - 1) * this._itemsPerPage();
    const end = start + this._itemsPerPage();
    return filtered.slice(start, end);
  });
  
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredBookings().length / this._itemsPerPage()))
  );

  // Methods
  setSearchTerm(term: string): void {
    this._searchTerm.set(term);
    this._currentPage.set(1); // Reset to first page on search
  }
  
  setCurrentPage(page: number): void {
    const total = this.filteredBookings().length;
    const maxPage = Math.max(1, Math.ceil(total / this._itemsPerPage()));
    if (page >= 1 && page <= maxPage) {
      this._currentPage.set(page);
    }
  }

  nextPage(): void {
    const total = this.filteredBookings().length;
    const maxPage = Math.max(1, Math.ceil(total / this._itemsPerPage()));
    if (this._currentPage() < maxPage) {
      this._currentPage.update(p => p + 1);
    }
  }

  previousPage(): void {
    if (this._currentPage() > 1) {
      this._currentPage.update(p => p - 1);
    }
  }

  toggleSidebar(): void {
    this._sidebarOpen.update(v => !v);
  }

  updateSummaryStats(stats: Partial<SummaryStats>): void {
    this._summaryStats.update(current => ({ ...current, ...stats }));
  }

  updateNotificationCount(count: number): void {
    this._notificationCount.set(count);
  }

  async refreshDashboard(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<{
          data?: {
            summary?: {
              total_income?: number | string;
              total_bookings?: number | string;
              total_trips?: number | string;
            };
            weekly_activity?: Array<{ day?: string; value?: number | string }>;
            bookings?: Array<{
              id?: string | number;
              booking_number?: string;
              booking_date?: string;
              status?: string;
              payment_method?: string;
              payment_gateway?: string;
              payment_status?: string;
              passenger?: { name?: string; phone?: string; email?: string };
              trip?: {
                plan?: string;
                bus_number?: string;
                trip_date?: string;
                trip_time?: string;
              };
              seat?: { number?: number | string; type?: string };
              total_amount?: number | string;
            }>;
          };
        }>(`${this.apiBaseUrl}/dashboard/transport-summary`)
      );

      const summary = response.data?.summary;
      const weeklyActivity = response.data?.weekly_activity ?? [];
      const bookings = response.data?.bookings ?? [];

      if (summary) {
        this.updateSummaryStats({
          todayEarnings: Number(summary.total_income ?? 0),
          totalPassengers: Number(summary.total_bookings ?? 0),
          totalTrips: Number(summary.total_trips ?? 0)
        });
      }

      if (weeklyActivity.length > 0) {
        this._weeklyActivity.set(
          weeklyActivity.map((item) => ({
            day: String(item.day ?? ''),
            value: Number(item.value ?? 0)
          }))
        );
      }

      if (bookings.length > 0 || this._bookings().length > 0) {
        this.setBookings(
          bookings.map((booking, index) => ({
            id: String(booking.id ?? index + 1),
            bookingNumber: String(booking.booking_number ?? `#${index + 1}`),
            bookingDate: String(booking.booking_date ?? '-'),
            status: this.normalizeBookingStatus(booking.status),
            paymentMethod: this.normalizePaymentMethod(booking.payment_method ?? booking.payment_gateway),
            paymentStatus: typeof booking.payment_status === 'string' ? booking.payment_status : undefined,
            passenger: {
              name: String(booking.passenger?.name ?? '—'),
              phone: String(booking.passenger?.phone ?? '—'),
              email: String(booking.passenger?.email ?? '—')
            },
            trip: {
              plan: String(booking.trip?.plan ?? '—'),
              busNumber: String(booking.trip?.bus_number ?? '—'),
              tripDate: String(booking.trip?.trip_date ?? '-'),
              tripTime: String(booking.trip?.trip_time ?? '-')
            },
            seat: {
              number: Number(booking.seat?.number ?? 0),
              type: this.normalizeSeatType(booking.seat?.type)
            },
            totalAmount: Number(booking.total_amount ?? 0)
          }))
        );
      }
    } catch {
      // Keep local fallback values when the API is temporarily unavailable.
    }
  }

  /** Replace all bookings (e.g. after loading from API). Resets pagination to page 1. */
  setBookings(bookings: Booking[]): void {
    this._bookings.set(bookings);
    this._currentPage.set(1);
  }

  // Booking CRUD operations
  getBookingById(id: string): Booking | undefined {
    return this._bookings().find(b => b.id === id);
  }

  addBooking(booking: Omit<Booking, 'id'>): void {
    const newId = (this._bookings().length + 1).toString();
    const newBooking: Booking = { ...booking, id: newId };
    this._bookings.update(bookings => [...bookings, newBooking]);
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
    const total = this.filteredBookings().length;
    const maxPage = Math.max(1, Math.ceil(total / this._itemsPerPage()));
    if (this._currentPage() > maxPage) {
      this._currentPage.set(maxPage);
    }
  }

  searchBookings(searchTerm: string): Booking[] {
    if (!searchTerm.trim()) {
      return this._bookings();
    }
    const term = searchTerm.toLowerCase();
    return this._bookings().filter(booking =>
      booking.id.includes(term) ||
      booking.bookingNumber.toLowerCase().includes(term) ||
      booking.passenger.name.toLowerCase().includes(term) ||
      booking.passenger.phone.includes(term) ||
      booking.passenger.email.toLowerCase().includes(term) ||
      booking.trip.plan.toLowerCase().includes(term) ||
      booking.trip.busNumber.toLowerCase().includes(term)
    );
  }

  private normalizeBookingStatus(status?: string): Booking['status'] {
    const normalized = (status ?? '').toLowerCase();
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

  private normalizeSeatType(type?: string): Booking['seat']['type'] {
    const normalized = (type ?? '').toLowerCase();
    if (normalized === 'vip') return 'vip';
    if (normalized === 'business') return 'business';
    return 'normal';
  }
}
