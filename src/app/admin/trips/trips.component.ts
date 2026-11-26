import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

interface Trip {
  id: string;
  departurePoint: string;
  destination: string;
  date: string;
  time: string;
  price: number;
  bus: string;
  status: 'available' | 'departed' | 'canceled' | 'confirmed';
}

interface NewTripForm {
  departurePoint: string;
  destination: string;
  departureDateTime: string;
  price: number;
  seats: number;
  bus: string;
  arrivalDateTime: string;
  photos: File[];
}

interface BackendTrip {
  id?: number | string;
  from_location?: string;
  to_location?: string;
  date?: string;
  time?: string;
  price?: number | string;
  bus_id?: number | string;
  bus?: { id?: number | string; name?: string; number?: string; code?: string };
  status?: string;
}

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.css'
})
export class TripsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  itemsPerPage = 5;

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  showModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  selectedTrip = signal<Trip | null>(null);

  busOptions = ['A123', 'B456', 'C789', 'D012', 'E345', 'F678', 'G901', 'H234', 'I567'];

  newTripForm: NewTripForm = {
    departurePoint: '',
    destination: '',
    departureDateTime: '',
    price: 0,
    seats: 0,
    bus: '',
    arrivalDateTime: '',
    photos: []
  };

  trips = signal<Trip[]>([]);

  ngOnInit() {
    void this.loadTrips();
  }

  filteredTrips = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      return this.trips();
    }
    return this.trips().filter((trip) =>
      trip.departurePoint.toLowerCase().includes(query) ||
      trip.destination.toLowerCase().includes(query) ||
      trip.bus.toLowerCase().includes(query) ||
      trip.date.includes(query)
    );
  });

  paginatedTrips = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredTrips().slice(start, end);
  });

  totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredTrips().length / this.itemsPerPage));
  });

  displayedRange = computed(() => {
    if (this.filteredTrips().length === 0) {
      return { start: 0, end: 0, total: 0 };
    }

    const start = (this.currentPage() - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage() * this.itemsPerPage, this.filteredTrips().length);
    return { start, end, total: this.filteredTrips().length };
  });

  async loadTrips() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await firstValueFrom(
        this.http.get<unknown>(`${this.apiBaseUrl}/trips`, this.getRequestOptions())
      );

      const backendTrips = this.extractTrips(response);
      this.trips.set(backendTrips.map((trip) => this.mapBackendTripToUiTrip(trip)));
      this.currentPage.set(1);
    } catch (error) {
      this.errorMessage.set(this.getApiErrorMessage(error, 'فشل تحميل الرحلات من الخادم.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.currentPage.set(1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  editTrip(trip: Trip) {
    if (trip.status === 'confirmed') {
      return;
    }

    this.selectedTrip.set(trip);
    const departureDateTime = this.toDateTimeLocal(trip.date, trip.time);

    this.newTripForm = {
      departurePoint: trip.departurePoint,
      destination: trip.destination,
      departureDateTime,
      price: trip.price,
      seats: 0,
      bus: trip.bus,
      arrivalDateTime: '',
      photos: []
    };
    this.showEditModal.set(true);
  }

  deleteTrip(trip: Trip) {
    if (trip.status === 'confirmed') {
      return;
    }

    this.selectedTrip.set(trip);
    this.showDeleteModal.set(true);
  }

  async confirmDelete() {
    const trip = this.selectedTrip();
    if (!trip || trip.status === 'confirmed') {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/transport/trips/${trip.id}`, this.getRequestOptions())
      );
      this.trips.update((trips) => trips.filter((t) => t.id !== trip.id));
      this.closeDeleteModal();
    } catch (error) {
      this.errorMessage.set(this.getApiErrorMessage(error, 'فشل حذف الرحلة.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'available':
        return 'status-pill status-available';
      case 'departed':
        return 'status-pill status-departed';
      case 'canceled':
        return 'status-pill status-canceled';
      case 'confirmed':
        return 'status-pill status-confirmed';
      default:
        return 'status-pill';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'available':
        return 'متاحة';
      case 'departed':
        return 'منطلقة';
      case 'canceled':
        return 'ملغاة';
      case 'confirmed':
        return 'مؤكدة';
      default:
        return status;
    }
  }

  openModal() {
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.resetForm();
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedTrip.set(null);
    this.resetForm();
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.selectedTrip.set(null);
  }

  resetForm() {
    this.newTripForm = {
      departurePoint: '',
      destination: '',
      departureDateTime: '',
      price: 0,
      seats: 0,
      bus: '',
      arrivalDateTime: '',
      photos: []
    };
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.newTripForm.photos = Array.from(input.files);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.newTripForm.photos = Array.from(event.dataTransfer.files);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  async onSubmit() {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const payload = this.buildTripPayload();
      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/transport/trips`, payload, this.getRequestOptions())
      );
      this.closeModal();
      await this.loadTrips();
    } catch (error) {
      this.errorMessage.set(this.getApiErrorMessage(error, 'فشل إضافة الرحلة.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onUpdateSubmit() {
    const trip = this.selectedTrip();
    if (!trip || trip.status === 'confirmed') {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const payload = this.buildTripPayload();
      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/transport/trips/${trip.id}`, payload, this.getRequestOptions())
      );
      this.closeEditModal();
      await this.loadTrips();
    } catch (error) {
      this.errorMessage.set(this.getApiErrorMessage(error, 'فشل تعديل الرحلة.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  canEdit(trip: Trip): boolean {
    return trip.status !== 'confirmed';
  }

  canDelete(trip: Trip): boolean {
    return trip.status !== 'confirmed';
  }

  private getRequestOptions() {
    return {
      headers: this.getAuthHeaders()
    };
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token') ?? sessionStorage.getItem('admin_token');
    let headers = new HttpHeaders({
      Accept: 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private extractTrips(response: unknown): BackendTrip[] {
    if (Array.isArray(response)) {
      return response as BackendTrip[];
    }

    if (response && typeof response === 'object') {
      const res = response as Record<string, unknown>;

      if (Array.isArray(res['data'])) {
        return res['data'] as BackendTrip[];
      }

      if (res['data'] && typeof res['data'] === 'object') {
        const data = res['data'] as Record<string, unknown>;
        if (Array.isArray(data['trips'])) {
          return data['trips'] as BackendTrip[];
        }
      }

      if (Array.isArray(res['trips'])) {
        return res['trips'] as BackendTrip[];
      }
    }

    return [];
  }

  private mapBackendTripToUiTrip(trip: BackendTrip): Trip {
    const status = this.normalizeStatus(trip.status);
    const busValue = trip.bus?.name ?? trip.bus?.number ?? trip.bus?.code ?? String(trip.bus_id ?? '');

    return {
      id: String(trip.id ?? ''),
      departurePoint: trip.from_location ?? '-',
      destination: trip.to_location ?? '-',
      date: this.toDisplayDate(trip.date ?? ''),
      time: this.toDisplayTime(trip.time ?? ''),
      price: Number(trip.price ?? 0),
      bus: busValue || '-',
      status
    };
  }

  private normalizeStatus(status?: string): Trip['status'] {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'confirmed') return 'confirmed';
    if (normalized === 'departed') return 'departed';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'canceled';
    return 'available';
  }

  private toDisplayDate(dateValue: string): string {
    if (!dateValue) return '-';
    const dateOnly = dateValue.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateOnly;
  }

  private toDisplayTime(timeValue: string): string {
    if (!timeValue) return '-';
    if (timeValue.toUpperCase().includes('AM') || timeValue.toUpperCase().includes('PM')) {
      return timeValue;
    }

    const timeOnly = timeValue.includes('T') ? timeValue.split('T')[1] : timeValue;
    const [hours, minutes] = timeOnly.split(':');
    const hour24 = Number(hours);
    const minuteValue = (minutes ?? '00').slice(0, 2);

    if (Number.isNaN(hour24)) return timeValue;

    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minuteValue} ${ampm}`;
  }

  private toDateTimeLocal(displayDate: string, displayTime: string): string {
    const dateParts = displayDate.split('-');
    if (dateParts.length !== 3) {
      return '';
    }

    const [day, month, year] = dateParts;
    const formattedDate = `${year}-${month}-${day}`;
    const { hour, minute } = this.parseDisplayTime(displayTime);

    return `${formattedDate}T${String(hour).padStart(2, '0')}:${minute}`;
  }

  private parseDisplayTime(timeValue: string): { hour: number; minute: string } {
    if (!timeValue) {
      return { hour: 0, minute: '00' };
    }

    if (timeValue.toUpperCase().includes('AM') || timeValue.toUpperCase().includes('PM')) {
      const [timePart, period] = timeValue.trim().split(' ');
      const [hourText, minuteText = '00'] = timePart.split(':');
      let hour = Number(hourText);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return { hour: Number.isNaN(hour) ? 0 : hour, minute: minuteText };
    }

    const [hourText, minuteText = '00'] = timeValue.split(':');
    const hour = Number(hourText);
    return { hour: Number.isNaN(hour) ? 0 : hour, minute: minuteText.slice(0, 2) };
  }

  private buildTripPayload() {
    const departureDate = new Date(this.newTripForm.departureDateTime);
    const year = departureDate.getFullYear();
    const month = String(departureDate.getMonth() + 1).padStart(2, '0');
    const day = String(departureDate.getDate()).padStart(2, '0');
    const hour = String(departureDate.getHours()).padStart(2, '0');
    const minute = String(departureDate.getMinutes()).padStart(2, '0');

    return {
      from_location: this.newTripForm.departurePoint,
      to_location: this.newTripForm.destination,
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
      price: String(this.newTripForm.price),
      bus_id: this.getBusId(this.newTripForm.bus),
      bus_label: this.newTripForm.bus,
      seats: this.newTripForm.seats,
      arrival_date_time: this.newTripForm.arrivalDateTime || null,
      long_start: '0',
      lat_start: '0',
      long_end: '0',
      lat_end: '0'
    };
  }

  private getBusId(busValue: string): number {
    const numeric = Number(busValue);
    if (!Number.isNaN(numeric) && numeric > 0) {
      return numeric;
    }

    const index = this.busOptions.findIndex((bus) => bus === busValue);
    return index >= 0 ? index + 1 : 1;
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
}
