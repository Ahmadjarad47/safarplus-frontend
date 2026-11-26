import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ComplaintListItem,
  ComplaintsAdminService
} from '../services/complaints-admin.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './complaints.component.html',
  styleUrl: './complaints.component.css'
})
export class ComplaintsComponent implements OnInit {
  private readonly api = inject(ComplaintsAdminService);

  showEditModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  selectedComplaint = signal<ComplaintListItem | null>(null);
  editingComplaint: ComplaintListItem | null = null;

  complaints = signal<ComplaintListItem[]>([]);
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  readonly itemsPerPage = 5;

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  apiError = signal<string>('');

  /** Draft admin response while editing */
  editResponseDraft = '';

  filteredComplaints = computed(() => {
    const term = this.searchQuery().trim().toLowerCase();
    const list = this.complaints();
    if (!term) {
      return list;
    }
    return list.filter(
      (c) =>
        c.passengerName.toLowerCase().includes(term) ||
        c.passengerPhone.includes(this.searchQuery().trim()) ||
        c.passengerEmail.toLowerCase().includes(term) ||
        c.passengerCity.toLowerCase().includes(term) ||
        c.message.toLowerCase().includes(term) ||
        (c.adminResponse && c.adminResponse.toLowerCase().includes(term))
    );
  });

  totalComplaints = computed(() => this.filteredComplaints().length);

  totalComplaintPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredComplaints().length / this.itemsPerPage))
  );

  paginatedComplaints = computed(() => {
    const filtered = this.filteredComplaints();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return filtered.slice(start, end);
  });

  ngOnInit(): void {
    void this.loadComplaints();
  }

  reloadComplaints(): void {
    void this.loadComplaints();
  }

  async loadComplaints(): Promise<void> {
    this.apiError.set('');
    this.isLoading.set(true);
    try {
      const list = await this.api.fetchComplaints();
      this.complaints.set(list);
      this.adjustPageBounds();
    } catch (err) {
      this.apiError.set(this.api.getApiErrorMessage(err, 'تعذر تحميل الشكاوى.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private adjustPageBounds(): void {
    const maxPage = Math.max(
      1,
      Math.ceil(this.filteredComplaints().length / this.itemsPerPage)
    );
    if (this.currentPage() > maxPage) {
      this.currentPage.set(maxPage);
    }
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.currentPage.set(1);
  }

  editComplaint(complaint: ComplaintListItem): void {
    this.editingComplaint = complaint;
    this.editResponseDraft = complaint.adminResponse ?? '';
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingComplaint = null;
    this.editResponseDraft = '';
  }

  deleteComplaint(complaint: ComplaintListItem): void {
    this.selectedComplaint.set(complaint);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedComplaint.set(null);
  }

  async saveResponse(): Promise<void> {
    const c = this.editingComplaint;
    if (!c) return;
    const text = this.editResponseDraft.trim();
    if (!text) {
      this.apiError.set('أدخل نص رد الإدارة.');
      return;
    }
    this.apiError.set('');
    this.isSubmitting.set(true);
    try {
      await this.api.respondComplaint(c.id, text);
      await this.loadComplaints();
      this.closeEditModal();
    } catch (err) {
      this.apiError.set(this.api.getApiErrorMessage(err, 'تعذر حفظ الرد.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async closeComplaintFromModal(): Promise<void> {
    const c = this.editingComplaint;
    if (!c) return;
    this.apiError.set('');
    this.isSubmitting.set(true);
    try {
      await this.api.closeComplaint(c.id);
      await this.loadComplaints();
      this.closeEditModal();
    } catch (err) {
      this.apiError.set(this.api.getApiErrorMessage(err, 'تعذر إغلاق الشكوى.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async confirmDelete(): Promise<void> {
    const complaint = this.selectedComplaint();
    if (!complaint) return;
    this.apiError.set('');
    this.isSubmitting.set(true);
    try {
      await this.api.deleteComplaint(complaint.id);
      await this.loadComplaints();
      this.closeDeleteModal();
      this.adjustPageBounds();
    } catch (err) {
      this.apiError.set(this.api.getApiErrorMessage(err, 'تعذر حذف الشكوى.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  formatDate(iso: string): string {
    return this.api.formatDate(iso);
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toLowerCase();
    switch (s) {
      case 'pending':
      case 'open':
        return 'badge-warning';
      case 'in_progress':
      case 'processing':
        return 'badge-info';
      case 'resolved':
        return 'badge-success';
      case 'closed':
        return 'badge-neutral';
      default:
        return 'badge-ghost';
    }
  }

  getStatusText(status: string): string {
    const s = (status ?? '').toLowerCase();
    switch (s) {
      case 'pending':
      case 'open':
        return 'قيد الانتظار';
      case 'in_progress':
      case 'processing':
        return 'قيد المعالجة';
      case 'resolved':
        return 'تم الحل';
      case 'closed':
        return 'مغلق';
      default:
        return status || '—';
    }
  }

  nextPage(): void {
    const currentPage = this.currentPage();
    const maxPage = this.totalComplaintPages();
    if (currentPage < maxPage) {
      this.currentPage.set(currentPage + 1);
    }
  }

  previousPage(): void {
    const currentPage = this.currentPage();
    if (currentPage > 1) {
      this.currentPage.set(currentPage - 1);
    }
  }

  Math = Math;
}
