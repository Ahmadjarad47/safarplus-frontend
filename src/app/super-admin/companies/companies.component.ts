import {
  Component,
  computed,
  inject,
  OnInit,
  signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { openExternalUrl } from '../../shared/utils/safe-url';
import { FormsModule } from '@angular/forms';
import { Company, CompanyDocument } from '../services/super-admin-state.service';
import { TransportCompaniesAdminService } from '../services/transport-companies-admin.service';
import { SuperAdminStateService } from '../services/super-admin-state.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-companies',
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css'
})
export class CompaniesComponent implements OnInit {
  private readonly api = inject(TransportCompaniesAdminService);
  readonly stateService = inject(SuperAdminStateService);

  showEditModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  showViewModal = signal<boolean>(false);
  selectedCompany = signal<Company | null>(null);
  editingCompany: Company | null = null;

  companies = signal<Company[]>([]);
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  readonly itemsPerPage = 5;

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  apiError = signal<string>('');

  formData: Partial<Company> = {
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    registrationDate: '',
    totalTrips: 0,
    totalBookings: 0,
    documents: []
  };

  filteredCompanies = computed(() => {
    const term = this.searchQuery().trim().toLowerCase();
    const list = this.companies();
    if (!term) {
      return list;
    }
    return list.filter(
      (company) =>
        company.name.toLowerCase().includes(term) ||
        company.email.toLowerCase().includes(term) ||
        company.phone.includes(this.searchQuery().trim())
    );
  });

  totalCompanies = computed(() => this.filteredCompanies().length);

  totalCompanyPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCompanies().length / this.itemsPerPage))
  );

  paginatedCompanies = computed(() => {
    const filtered = this.filteredCompanies();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return filtered.slice(start, end);
  });

  async ngOnInit() {
    await this.loadCompanies();
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.currentPage.set(1);
  }

  editCompany(company: Company) {
    this.showViewModal.set(false);
    this.editingCompany = { ...company, documents: [...(company.documents || [])] };
    this.formData = {
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      status: company.status,
      registrationDate: company.registrationDate,
      totalTrips: company.totalTrips,
      totalBookings: company.totalBookings
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingCompany = null;
    this.resetForm();
  }

  deleteCompany(company: Company) {
    this.selectedCompany.set(company);
    this.showDeleteModal.set(true);
    this.showViewModal.set(false);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.selectedCompany.set(null);
  }

  async confirmDelete() {
    const company = this.selectedCompany();
    if (!company || this.isSubmitting()) {
      return;
    }
    this.isSubmitting.set(true);
    this.apiError.set('');
    try {
      await this.api.deleteCompany(company.id);
      await this.loadCompanies();
      this.closeDeleteModal();
    } catch (e: unknown) {
      this.apiError.set(
        this.api.getApiErrorMessage(e, 'فشل حذف الشركة من الخادم.')
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async saveCompany() {
    if (!this.editingCompany || this.isSubmitting()) {
      return;
    }
    this.isSubmitting.set(true);
    this.apiError.set('');
    try {
      const payload: Record<string, unknown> = {
        name: this.formData.name?.trim(),
        email: this.formData.email?.trim(),
        phone: this.formData.phone?.trim(),
        ...(this.formData.address != null &&
        String(this.formData.address).trim() !== ''
          ? { address: String(this.formData.address).trim() }
          : {})
      };

      await this.api.updateCompany(this.editingCompany.id, payload);

      /** Document uploads غير متصلة بواجهة الخادم المذكورة؛ إعادة التحميل تزامن القائمة. */
      await this.loadCompanies();
      this.closeEditModal();
    } catch (e: unknown) {
      this.apiError.set(
        this.api.getApiErrorMessage(e, 'فشل حفظ تعديلات الشركة.')
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm() {
    this.formData = {
      name: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
      registrationDate: '',
      totalTrips: 0,
      totalBookings: 0
    };
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
      case 'approved':
        return 'badge-success';
      case 'inactive':
        return 'badge-warning';
      case 'suspended':
      case 'pending':
      case 'recently_submitted':
        return 'badge-warning';
      case 'blocked':
      case 'rejected':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active':
        return 'مفعلة';
      case 'inactive':
        return 'غير نشط';
      case 'suspended':
        return 'معلق';
      case 'blocked':
        return 'محظورة';
      case 'recently_submitted':
      case 'pending':
        return 'قيد المراجعة';
      case 'approved':
        return 'معتمدة';
      case 'rejected':
        return 'مرفوضة';
      default:
        return status;
    }
  }

  viewCompany(company: Company) {
    this.selectedCompany.set(company);
    this.showViewModal.set(true);
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.selectedCompany.set(null);
  }

  async acceptCompany() {
    const company = this.selectedCompany();
    if (!company || this.isSubmitting()) {
      return;
    }
    this.isSubmitting.set(true);
    this.apiError.set('');
    try {
      await this.api.approveCompany(company.id);
      await this.loadCompanies();
      this.closeViewModal();
    } catch (e: unknown) {
      this.apiError.set(
        this.api.getApiErrorMessage(e, 'فشل اعتماد الشركة.')
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async rejectCompany() {
    const company = this.selectedCompany();
    if (!company || this.isSubmitting()) {
      return;
    }
    this.isSubmitting.set(true);
    this.apiError.set('');
    try {
      await this.api.rejectCompany(company.id);
      await this.loadCompanies();
      this.closeViewModal();
    } catch (e: unknown) {
      this.apiError.set(
        this.api.getApiErrorMessage(e, 'فشل رفض الشركة.')
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  viewDocument(doc: CompanyDocument) {
    const url = doc.fileUrl;
    if (url) {
      openExternalUrl(url);
    }
  }

  nextPage() {
    const cp = this.currentPage();
    const max = this.totalCompanyPages();
    if (cp < max) {
      this.currentPage.set(cp + 1);
    }
  }

  previousPage() {
    const cp = this.currentPage();
    if (cp > 1) {
      this.currentPage.set(cp - 1);
    }
  }

  Math = Math;

  private async loadCompanies() {
    this.isLoading.set(true);
    this.apiError.set('');
    try {
      const rows = await this.api.fetchCompanies();
      this.companies.set(rows);
      this.stateService.updateSummaryStats({ totalCompanies: rows.length });
      const term = this.searchQuery().trim().toLowerCase();
      const trimmed = this.searchQuery().trim();
      const filteredCount = !term
        ? rows.length
        : rows.filter(
            (c) =>
              c.name.toLowerCase().includes(term) ||
              c.email.toLowerCase().includes(term) ||
              c.phone.includes(trimmed)
          ).length;
      const maxPage = Math.max(1, Math.ceil(filteredCount / this.itemsPerPage));
      if (this.currentPage() > maxPage) {
        this.currentPage.set(maxPage);
      }
    } catch (e: unknown) {
      this.apiError.set(
        this.api.getApiErrorMessage(e, 'فشل تحميل قائمة الشركات من الخادم.')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  reloadCompanies(): void {
    void this.loadCompanies();
  }
}
