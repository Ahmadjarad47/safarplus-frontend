import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { openExternalUrl } from '../../shared/utils/safe-url';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { getApiErrorMessage } from '../../core/http/api-error';

export interface Advertisement {
  id: string;
  title: string;
  description: string;
  geographicTarget: string;
  imageUrl: string;
  imageFile?: File | null;
  status: 'active' | 'inactive';
  startDate: string;
  endDate: string;
  views?: number;
  clicks?: number;
}

interface BackendAdRow {
  id?: number | string;
  title?: string;
  description?: string;
  geographic_target?: string;
  target?: string;
  location?: string;
  zone?: string;
  image?: string;
  image_url?: string;
  photo?: string;
  status?: string;
  is_active?: boolean | number;
  start_date?: string;
  end_date?: string;
  starts_at?: string;
  expires_at?: string;
  views?: number;
  clicks?: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-advertisements',
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './advertisements.component.html',
  styleUrl: './advertisements.component.css'
})
export class AdvertisementsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();
  private readonly assetOrigin = this.apiBaseUrl.replace(/\/api\/v1$/, '');

  showCreateModal = signal(false);
  showDeleteModal = signal(false);
  editingAdvertisement: Advertisement | null = null;
  deletingAdvertisement: Advertisement | null = null;

  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  currentPage = signal(1);
  itemsPerPage = signal(5);

  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly isDeleting = signal(false);
  readonly apiError = signal('');
  readonly formModalError = signal('');

  advertisements = signal<Advertisement[]>([]);

  formData = {
    title: '',
    description: '',
    geographicTarget: '',
    startDate: '',
    endDate: '',
    imageFile: null as File | null,
    imagePreview: ''
  };

  ngOnInit(): void {
    void this.loadAdvertisements();
  }

  readonly filteredAdvertisements = computed(() => {
    let filtered = this.advertisements();
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    if (term) {
      filtered = filtered.filter(
        (ad) =>
          ad.title.toLowerCase().includes(term) ||
          ad.description.toLowerCase().includes(term) ||
          ad.geographicTarget.toLowerCase().includes(term)
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter((ad) => ad.status === status);
    }

    return filtered;
  });

  readonly paginatedAdvertisements = computed(() => {
    const filtered = this.filteredAdvertisements();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return filtered.slice(start, end);
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAdvertisements().length / this.itemsPerPage()))
  );

  readonly totalCount = computed(() => this.filteredAdvertisements().length);

  statusClass(status: string) {
    switch (status) {
      case 'active':
        return 'badge-success text-white';
      case 'inactive':
        return 'badge-error text-white';
      default:
        return 'badge-ghost';
    }
  }

  statusText(status: string) {
    switch (status) {
      case 'active':
        return 'نشطة';
      case 'inactive':
        return 'غير نشطة';
      default:
        return status;
    }
  }

  imageAttachmentLabel(): string {
    const f = this.formData.imageFile;
    return f?.name?.trim() || 'صورة الإعلان';
  }

  refreshAdvertisements() {
    void this.loadAdvertisements();
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive') {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  openCreateModal() {
    this.editingAdvertisement = null;
    this.formModalError.set('');
    this.resetForm();
    this.showCreateModal.set(true);
  }

  editAdvertisement(ad: Advertisement) {
    this.editingAdvertisement = ad;
    this.formModalError.set('');
    const convertDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    };

    this.formData = {
      title: ad.title,
      description: ad.description,
      geographicTarget: ad.geographicTarget,
      startDate: convertDate(ad.startDate),
      endDate: convertDate(ad.endDate),
      imageFile: null,
      imagePreview: ad.imageUrl
    };
    this.showCreateModal.set(true);
  }

  deleteAdvertisement(ad: Advertisement) {
    this.deletingAdvertisement = ad;
    this.showDeleteModal.set(true);
  }

  async confirmDelete() {
    const target = this.deletingAdvertisement;
    if (!target) {
      return;
    }

    this.isDeleting.set(true);
    this.apiError.set('');

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/ads/${target.id}`)
      );
      await this.loadAdvertisements();
      const maxPage = Math.max(1, Math.ceil(this.filteredAdvertisements().length / this.itemsPerPage()));
      if (this.currentPage() > maxPage) {
        this.currentPage.set(maxPage);
      }
      this.closeDeleteModal();
    } catch (error) {
      this.apiError.set(getApiErrorMessage(error, 'فشل حذف الإعلان.'));
    } finally {
      this.isDeleting.set(false);
    }
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.deletingAdvertisement = null;
  }

  async saveAdvertisement() {
    if (!this.editingAdvertisement && !this.formData.imageFile) {
      this.formModalError.set('يجب اختيار صورة للإعلان.');
      return;
    }

    this.formModalError.set('');
    this.isSubmitting.set(true);

    try {
      const body = this.buildAdFormData();
      if (this.editingAdvertisement) {
        await firstValueFrom(
          this.http.post(
            `${this.apiBaseUrl}/ads/${this.editingAdvertisement.id}`,
            body
          )
        );
      } else {
        await firstValueFrom(
          this.http.post(`${this.apiBaseUrl}/ads`, body)
        );
      }
      this.closeCreateModal();
      await this.loadAdvertisements();
    } catch (error) {
      this.formModalError.set(getApiErrorMessage(error, 'فشل حفظ الإعلان.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.editingAdvertisement = null;
    this.formModalError.set('');
    this.resetForm();
  }

  resetForm() {
    this.formData = {
      title: '',
      description: '',
      geographicTarget: '',
      startDate: '',
      endDate: '',
      imageFile: null,
      imagePreview: ''
    };
  }

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.formData.imageFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.formData.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  removeImage() {
    this.formData.imageFile = null;
    this.formData.imagePreview = '';
  }

  viewImage(imageUrl: string) {
    const url = this.resolveAssetUrl(imageUrl);
    openExternalUrl(url);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  Math = Math;

  private async loadAdvertisements() {
    this.isLoading.set(true);
    this.apiError.set('');

    try {
      const response = await firstValueFrom(
        this.http.get<unknown>(`${this.apiBaseUrl}/ads`)
      );
      const rows = this.extractAds(response);
      const mapped = rows
        .map((r) => this.mapBackendToAdvertisement(r))
        .filter((x): x is Advertisement => x !== null);
      this.advertisements.set(mapped);
      this.currentPage.set(1);
    } catch (error) {
      this.apiError.set(getApiErrorMessage(error, 'فشل تحميل الإعلانات من الخادم.'));
      this.advertisements.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private buildAdFormData(): FormData {
    const fd = new FormData();
    fd.append('title', this.formData.title.trim());
    fd.append('description', this.formData.description.trim());
    fd.append('geographic_target', this.formData.geographicTarget.trim());

    const startIso = this.formData.startDate.trim();
    const endIso = this.formData.endDate.trim();
    if (startIso) {
      fd.append('start_date', startIso);
    }
    if (endIso) {
      fd.append('end_date', endIso);
    }

    const file = this.formData.imageFile;
    if (file) {
      fd.append('image', file, file.name);
    }

    return fd;
  }

  private extractAds(response: unknown): BackendAdRow[] {
    if (Array.isArray(response)) {
      return response as BackendAdRow[];
    }

    if (response && typeof response === 'object') {
      const res = response as Record<string, unknown>;
      if (Array.isArray(res['data'])) {
        return res['data'] as BackendAdRow[];
      }
      if (res['data'] && typeof res['data'] === 'object') {
        const data = res['data'] as Record<string, unknown>;
        if (Array.isArray(data['ads'])) {
          return data['ads'] as BackendAdRow[];
        }
      }
      if (Array.isArray(res['ads'])) {
        return res['ads'] as BackendAdRow[];
      }
    }

    return [];
  }

  private mapBackendToAdvertisement(row: BackendAdRow): Advertisement | null {
    if (row.id == null || row.id === '') {
      return null;
    }

    const rawImg =
      row.image_url ??
      row.image ??
      row.photo ??
      '';

    const geo =
      row.geographic_target ??
      row.target ??
      row.location ??
      row.zone ??
      '';

    const startSrc = row.start_date ?? row.starts_at ?? '';
    const endSrc = row.end_date ?? row.expires_at ?? '';

    return {
      id: String(row.id),
      title: row.title ?? '',
      description: row.description ?? '',
      geographicTarget: String(geo),
      imageUrl: this.resolveAssetUrl(typeof rawImg === 'string' ? rawImg : String(rawImg)),
      status: this.normalizeAdStatus(row.status, row.is_active),
      startDate: this.toDisplayDate(startSrc),
      endDate: this.toDisplayDate(endSrc),
      views: row.views,
      clicks: row.clicks
    };
  }

  private normalizeAdStatus(status?: string, isActive?: boolean | number): 'active' | 'inactive' {
    const s = (status ?? '').toLowerCase();
    if (s === 'inactive' || s === 'disabled' || s === '0') {
      return 'inactive';
    }
    if (s === 'active' || s === 'enabled' || s === '1') {
      return 'active';
    }

    if (typeof isActive === 'number') {
      return isActive === 1 ? 'active' : 'inactive';
    }
    if (typeof isActive === 'boolean') {
      return isActive ? 'active' : 'inactive';
    }

    return 'inactive';
  }

  private toDisplayDate(raw: string): string {
    if (!raw?.trim()) {
      return '—';
    }
    const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw.trim();
    const parts = dateOnly.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts;
      return `${d}-${m}-${y}`;
    }
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${d}-${m}-${y}`;
    }
    return raw;
  }

  private resolveAssetUrl(pathOrUrl: string): string {
    const v = pathOrUrl?.trim() ?? '';
    if (!v) {
      return '';
    }
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:')) {
      return v;
    }
    if (v.startsWith('//')) {
      return `https:${v}`;
    }
    const path = v.startsWith('/') ? v : `/${v}`;
    return `${this.assetOrigin}${path}`;
  }

}
