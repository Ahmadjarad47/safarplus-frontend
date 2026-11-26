import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminStateService, Booking } from '../services/admin-state.service';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { getApiErrorMessage } from '../../core/http/api-error';

interface ApiBookingTrip {
  from_location?: string;
  to_location?: string;
  date?: string;
  time?: string;
  price?: string | number;
  bus_id?: number | string;
}

interface ApiBookingUser {
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

interface ApiBooking {
  id?: number | string;
  seat_number?: number;
  status?: string;
  payment_method?: string;
  payment_gateway?: string;
  payment_status?: string;
  created_at?: string;
  booking_number?: string;
  booking_date?: string;
  total_amount?: string | number;
  user?: ApiBookingUser;
  trip?: ApiBookingTrip;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bookings',
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css'
})
export class BookingsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();
  readonly paymentMethods = ['سيرياتيل كاش', 'فاتورة', 'ام تي ان كاش', 'شام كاش'];

  readonly isLoading = signal(false);
  readonly apiError = signal('');

  selectedBooking: Booking | null = null;
  showDetailsModal = signal(false);
  showEditModal = signal(false);
  editingBooking: Booking | null = null;

  formData = {
    bookingNumber: '',
    bookingDate: '',
    status: 'pending' as 'confirmed' | 'pending' | 'canceled',
    paymentMethod: 'شام كاش',
    passenger: {
      name: '',
      phone: '',
      email: ''
    },
    trip: {
      plan: '',
      busNumber: '',
      tripDate: '',
      tripTime: ''
    },
    seat: {
      number: 0,
      type: 'normal' as 'normal' | 'vip' | 'business'
    },
    totalAmount: 0
  };

  constructor(public stateService: AdminStateService) {}

  ngOnInit(): void {
    void this.loadBookings();
  }

  statusBadgeClass(status: string) {
    switch (status) {
      case 'confirmed':
        return 'bggreen';
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

  seatTypeText(type: string) {
    switch (type) {
      case 'normal':
        return 'عادي';
      case 'vip':
        return 'VIP';
      case 'business':
        return 'بزنس';
      default:
        return type;
    }
  }

  paymentGatewayLabel(gateway: string | undefined): string {
    const value = (gateway ?? '').trim();
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
        return value || '—';
    }
  }

  paymentStatusLabel(status: string | undefined): string {
    switch ((status ?? '').toLowerCase()) {
      case 'unpaid':
        return 'غير مدفوع';
      case 'paid':
        return 'مدفوع';
      case 'pending':
        return 'قيد التحقق';
      default:
        return status?.trim() || '';
    }
  }

  async loadBookings() {
    this.isLoading.set(true);
    this.apiError.set('');

    try {
      const response = await firstValueFrom(
        this.http.get<{ data?: { bookings?: ApiBooking[] } }>(
          `${this.apiBaseUrl}/transport/bookings`
        )
      );
      const rows = response.data?.bookings ?? [];
      const mapped = rows.map((row) => this.mapApiBookingToBooking(row));
      this.stateService.setBookings(mapped);
    } catch (error) {
      this.apiError.set(getApiErrorMessage(error, 'فشل تحميل الحجوزات من الخادم.'));
      this.stateService.setBookings([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.stateService.setSearchTerm(input.value);
  }

  refreshBookings() {
    this.stateService.setSearchTerm('');
    void this.loadBookings();
  }

  viewBooking(id: string) {
    const booking = this.stateService.getBookingById(id);
    if (booking) {
      this.selectedBooking = booking;
      this.showDetailsModal.set(true);
    }
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedBooking = null;
  }

  openCreateModal() {
    this.editingBooking = null;
    this.resetForm();
    this.showEditModal.set(true);
  }

  editBooking(id: string) {
    const booking = this.stateService.getBookingById(id);
    if (!booking) {
      return;
    }

    this.editingBooking = booking;
    this.formData = {
      bookingNumber: booking.bookingNumber,
      bookingDate: this.displayDateToYmd(booking.bookingDate),
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      passenger: {
        name: booking.passenger.name,
        phone: booking.passenger.phone,
        email: booking.passenger.email
      },
      trip: {
        plan: booking.trip.plan,
        busNumber: booking.trip.busNumber,
        tripDate: this.displayDateToYmd(booking.trip.tripDate),
        tripTime: booking.trip.tripTime
      },
      seat: {
        number: booking.seat.number,
        type: booking.seat.type
      },
      totalAmount: booking.totalAmount
    };
    this.showEditModal.set(true);
    this.showDetailsModal.set(false);
  }

  deleteBooking(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الحجز؟')) {
      return;
    }

    void this.deleteBookingFromApi(id);
  }

  async saveBooking() {
    const payload = this.toApiPayload();

    try {
      if (this.editingBooking) {
        await firstValueFrom(
          this.http.post(
            `${this.apiBaseUrl}/transport/bookings/${this.editingBooking.id}`,
            payload
          )
        );
      } else {
        await firstValueFrom(
          this.http.post(
            `${this.apiBaseUrl}/transport/bookings`,
            payload
          )
        );
      }

      await this.loadBookings();
      this.cancelEdit();
    } catch (error) {
      this.apiError.set(getApiErrorMessage(error, 'فشل حفظ الحجز.'));
    }
  }

  cancelEdit() {
    this.showEditModal.set(false);
    this.editingBooking = null;
    this.resetForm();
  }

  resetForm() {
    this.formData = {
      bookingNumber: '',
      bookingDate: '',
      status: 'pending',
      paymentMethod: 'شام كاش',
      passenger: {
        name: '',
        phone: '',
        email: ''
      },
      trip: {
        plan: '',
        busNumber: '',
        tripDate: '',
        tripTime: ''
      },
      seat: {
        number: 0,
        type: 'normal'
      },
      totalAmount: 0
    };
  }

  nextPage() {
    this.stateService.nextPage();
  }

  previousPage() {
    this.stateService.previousPage();
  }

  goToPage(page: number) {
    this.stateService.setCurrentPage(page);
  }

  private mapApiBookingToBooking(row: ApiBooking): Booking {
    const id = String(row.id ?? '');
    const user = row.user ?? {};
    const trip = row.trip ?? {};

    const from = trip.from_location?.trim() || '';
    const to = trip.to_location?.trim() || '';
    const plan = from && to ? `${from} - ${to}` : from || to || '—';

    const fname = user.first_name?.trim() ?? '';
    const lname = user.last_name?.trim() ?? '';
    const passengerName = user.name?.trim() || [fname, lname].filter(Boolean).join(' ') || '—';

    const priceRaw = row.total_amount ?? trip.price ?? 0;
    const totalAmount = typeof priceRaw === 'number' ? priceRaw : Number.parseFloat(String(priceRaw)) || 0;

    return {
      id,
      bookingNumber: String(row.booking_number ?? (id ? `#${id}` : '')),
      bookingDate: this.ymdToDisplayDate(row.booking_date) || this.isoOrEmptyToDisplayDate(row.created_at),
      status: this.normalizeBookingStatus(row.status),
      paymentMethod: this.paymentGatewayLabel(row.payment_gateway ?? row.payment_method),
      paymentStatus: row.payment_status,
      passenger: {
        name: passengerName,
        phone: user.phone?.trim() || '—',
        email: user.email?.trim() || '—'
      },
      trip: {
        plan,
        busNumber: trip.bus_id != null ? String(trip.bus_id) : '—',
        tripDate: this.ymdToDisplayDate(trip.date),
        tripTime: this.formatTripTime(trip.time)
      },
      seat: {
        number: row.seat_number ?? 0,
        type: 'normal'
      },
      totalAmount
    };
  }

  private toApiPayload() {
    return {
      booking_number: this.formData.bookingNumber.trim() || undefined,
      booking_date: this.formData.bookingDate || undefined,
      status: this.formData.status,
      payment_method: this.formData.paymentMethod,
      passenger_name: this.formData.passenger.name,
      passenger_phone: this.formData.passenger.phone,
      passenger_email: this.formData.passenger.email,
      trip_plan: this.formData.trip.plan.trim() || undefined,
      trip_bus_number: this.formData.trip.busNumber.trim() || undefined,
      trip_date: this.formData.trip.tripDate || undefined,
      trip_time: this.normalizeTripTime(this.formData.trip.tripTime),
      seat_number: this.formData.seat.number,
      seat_type: this.formData.seat.type,
      total_amount: this.formData.totalAmount,
    };
  }

  private async deleteBookingFromApi(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/transport/bookings/${id}`)
      );
      await this.loadBookings();

      if (this.selectedBooking?.id === id) {
        this.selectedBooking = null;
        this.showDetailsModal.set(false);
      }
    } catch (error) {
      this.apiError.set(getApiErrorMessage(error, 'فشل حذف الحجز.'));
    }
  }

  private normalizeBookingStatus(status: string | undefined): Booking['status'] {
    const s = (status ?? '').toLowerCase();
    if (s === 'confirmed' || s === 'completed' || s === 'complete') {
      return 'confirmed';
    }
    if (s === 'canceled' || s === 'cancelled') {
      return 'canceled';
    }
    return 'pending';
  }

  private isoOrEmptyToDisplayDate(iso: string | undefined): string {
    if (!iso?.trim()) {
      return '';
    }
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}-${month}-${year}`;
    }
    return '';
  }

  private ymdToDisplayDate(ymd: string | undefined): string {
    const raw = ymd?.trim();
    if (!raw) {
      return '';
    }
    const parts = raw.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d}-${m}-${y}`;
    }
    return raw;
  }

  private displayDateToYmd(displayDate: string): string {
    const raw = displayDate.trim();
    if (!raw) {
      return '';
    }

    const parts = raw.split('-');
    if (parts.length === 3 && parts[0].length === 2) {
      const [day, month, year] = parts;
      return `${year}-${month}-${day}`;
    }

    return raw;
  }

  private formatTripTime(time: string | undefined): string {
    const t = time?.trim();
    if (!t) {
      return '—';
    }
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(t);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : t;
  }

  private normalizeTripTime(time: string): string | undefined {
    const raw = time.trim();
    if (!raw) {
      return undefined;
    }

    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(raw);
    if (!match) {
      return raw;
    }

    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  Math = Math;
}
