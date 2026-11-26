import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { getApiErrorMessage } from '../../core/http/api-error';
import { createPager } from '../../shared/utils/pager';

interface Vehicle {
  id: string;
  type: string;
  plateNumber: string;
  capacity: number;
  status: 'available' | 'in-use';
}

interface VehicleForm {
  type: string;
  plateNumber: string;
  capacity: number;
}

interface BackendVehicle {
  id?: number | string;
  type?: string;
  plate_number?: string;
  plateNumber?: string;
  capacity?: number | string;
  status?: string;
  is_active?: boolean | number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vehicles',
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.css'
})
export class VehiclesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  searchQuery = signal<string>('');
  readonly itemsPerPage = 5;
  showModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  showErrorModal = signal<boolean>(false);
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  apiError = signal<string>('');
  selectedVehicle = signal<Vehicle | null>(null);

  vehicles = signal<Vehicle[]>([]);

  vehicleForm: VehicleForm = {
    type: '',
    plateNumber: '',
    capacity: 0
  };

  filteredVehicles = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      return this.vehicles();
    }
    return this.vehicles().filter(vehicle =>
      vehicle.type.toLowerCase().includes(query) ||
      vehicle.plateNumber.toLowerCase().includes(query) ||
      vehicle.capacity.toString().includes(query)
    );
  });

  private readonly pager = createPager(this.filteredVehicles, this.itemsPerPage);
  readonly currentPage = this.pager.currentPage;
  readonly totalPages = this.pager.totalPages;
  readonly paginatedVehicles = this.pager.pageItems;
  readonly displayedRange = this.pager.range;




  ngOnInit(): void {
    void this.loadVehicles();
  }

  async loadVehicles() {
    this.isLoading.set(true);
    this.apiError.set('');

    try {
      const response = await firstValueFrom(
        this.http.get<unknown>(`${this.apiBaseUrl}/transport/buses`)
      );
      const backendVehicles = this.extractVehicles(response);
      this.vehicles.set(backendVehicles.map((vehicle) => this.mapBackendVehicleToUiVehicle(vehicle)));
      this.pager.reset();
    } catch (error) {
      this.apiError.set(getApiErrorMessage(error, 'فشل تحميل بيانات المركبات من الخادم.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'available':
        return 'متاح';
      case 'in-use':
        return 'في الخدمة';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'available':
        return 'bggreen';
      case 'in-use':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.pager.reset();
  }

  nextPage() {
    this.pager.next();
  }

  previousPage() {
    this.pager.previous();
  }

  openModal() {
    this.showModal.set(true);
    this.resetForm();
  }

  closeModal() {
    this.showModal.set(false);
    this.resetForm();
  }

  openEditModal(vehicle: Vehicle) {
    if (vehicle.status === 'in-use') {
      this.showErrorModal.set(true);
      this.errorMessage.set('لا يمكن تعديل المكربة لانها قيد العمل');
      return;
    }
    this.selectedVehicle.set(vehicle);
    this.vehicleForm = {
      type: vehicle.type,
      plateNumber: vehicle.plateNumber,
      capacity: vehicle.capacity
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedVehicle.set(null);
    this.resetForm();
  }

  openDeleteModal(vehicle: Vehicle) {
    if (vehicle.status === 'in-use') {
      this.showErrorModal.set(true);
      this.errorMessage.set('لا يمكن حذف المركبة لانها في حالة عمل');
      return;
    }
    this.selectedVehicle.set(vehicle);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.selectedVehicle.set(null);
  }

  closeErrorModal() {
    this.showErrorModal.set(false);
    this.errorMessage.set('');
  }

  resetForm() {
    this.vehicleForm = {
      type: '',
      plateNumber: '',
      capacity: 0
    };
  }

  onSubmit() {
    void this.createVehicle();
  }

  onUpdateSubmit() {
    void this.updateVehicle();
  }

  async createVehicle() {
    this.isSubmitting.set(true);
    this.apiError.set('');

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiBaseUrl}/transport/buses`,
          this.buildVehiclePayload()
        )
      );
      this.closeModal();
      await this.loadVehicles();
    } catch (error) {
      this.apiError.set(getApiErrorMessage(error, 'فشل إضافة المركبة.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async updateVehicle() {
    const vehicle = this.selectedVehicle();
    if (!vehicle || vehicle.status === 'in-use') {
      return;
    }

    this.isSubmitting.set(true);
    this.apiError.set('');

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiBaseUrl}/transport/buses/${vehicle.id}`,
          this.buildVehiclePayload()
        )
      );
      this.closeEditModal();
      await this.loadVehicles();
    } catch (error) {
      this.apiError.set(getApiErrorMessage(error, 'فشل تعديل بيانات المركبة.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  confirmDelete() {
    void this.deleteVehicle();
  }

  async deleteVehicle() {
    const vehicle = this.selectedVehicle();
    if (!vehicle || vehicle.status === 'in-use') {
      return;
    }

    this.isSubmitting.set(true);
    this.apiError.set('');

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/transport/buses/${vehicle.id}`)
      );
      this.closeDeleteModal();
      await this.loadVehicles();
    } catch (error) {
      this.apiError.set(getApiErrorMessage(error, 'فشل حذف المركبة.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  canEdit(vehicle: Vehicle): boolean {
    return vehicle.status !== 'in-use';
  }

  canDelete(vehicle: Vehicle): boolean {
    return vehicle.status !== 'in-use';
  }

  private buildVehiclePayload() {
    return {
      plate_number: this.vehicleForm.plateNumber.trim(),
      type: this.vehicleForm.type.trim(),
      capacity: String(this.vehicleForm.capacity)
    };
  }

  private extractVehicles(response: unknown): BackendVehicle[] {
    if (Array.isArray(response)) {
      return response as BackendVehicle[];
    }

    if (response && typeof response === 'object') {
      const res = response as Record<string, unknown>;

      if (Array.isArray(res['data'])) {
        return res['data'] as BackendVehicle[];
      }

      if (res['data'] && typeof res['data'] === 'object') {
        const data = res['data'] as Record<string, unknown>;
        if (Array.isArray(data['buses'])) {
          return data['buses'] as BackendVehicle[];
        }
      }

      if (Array.isArray(res['buses'])) {
        return res['buses'] as BackendVehicle[];
      }
    }

    return [];
  }

  private mapBackendVehicleToUiVehicle(vehicle: BackendVehicle): Vehicle {
    const rawPlateNumber = vehicle.plate_number ?? vehicle.plateNumber ?? '';

    return {
      id: String(vehicle.id ?? ''),
      type: vehicle.type ?? '-',
      plateNumber: String(rawPlateNumber),
      capacity: Number(vehicle.capacity ?? 0),
      status: this.normalizeStatus(vehicle.status, vehicle.is_active)
    };
  }

  private normalizeStatus(status?: string, isActive?: boolean | number): Vehicle['status'] {
    const normalized = (status ?? '').toLowerCase();

    if (normalized === 'in-use' || normalized === 'in_use' || normalized === 'busy' || normalized === 'running') {
      return 'in-use';
    }

    if (normalized === 'available' || normalized === 'active') {
      return 'available';
    }

    if (typeof isActive === 'number') {
      return isActive === 1 ? 'available' : 'in-use';
    }

    if (typeof isActive === 'boolean') {
      return isActive ? 'available' : 'in-use';
    }

    return 'available';
  }

  // Expose Math for template
  Math = Math;
}

