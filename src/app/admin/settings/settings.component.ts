import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

export interface CompanySettings {
  id: string;
  companyName: string;
  companyAddress: string;
  email: string;
  phoneNumber: string;
}

export interface CompanyFile {
  id: string;
  fileName: string;
  fileUrl: string;
  downloadUrl: string;
  fileType: string;
  uploadDate: string;
}

interface SettingsResponse {
  data?: {
    company?: {
      id?: string | number;
      name?: string;
      address?: string;
      email?: string;
      phone?: string;
    };
    files?: Array<{
      id?: string | number;
      file_name?: string;
      view_url?: string;
      download_url?: string;
      file_type?: string;
      upload_date?: string;
    }>;
  };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  readonly isEditMode = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  readonly apiError = signal('');
  readonly successMessage = signal('');

  private readonly _companySettings = signal<CompanySettings>({
    id: '',
    companyName: '',
    companyAddress: '',
    email: '',
    phoneNumber: ''
  });

  formData: CompanySettings = {
    id: '',
    companyName: '',
    companyAddress: '',
    email: '',
    phoneNumber: ''
  };

  private readonly _companyFiles = signal<CompanyFile[]>([]);
  readonly companySettings = computed(() => this._companySettings());
  readonly companyFiles = computed(() => this._companyFiles());

  selectedFile: File | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    this.isLoading.set(true);
    this.apiError.set('');

    try {
      const response = await firstValueFrom(
        this.http.get<SettingsResponse>(`${this.apiBaseUrl}/admin/company-settings`, {
          headers: this.getAuthHeaders()
        })
      );

      const company = response.data?.company;
      const files = response.data?.files ?? [];

      const settings: CompanySettings = {
        id: String(company?.id ?? ''),
        companyName: String(company?.name ?? ''),
        companyAddress: String(company?.address ?? ''),
        email: String(company?.email ?? ''),
        phoneNumber: String(company?.phone ?? '')
      };

      this._companySettings.set(settings);
      this.formData = { ...settings };
      this._companyFiles.set(
        files.map((file) => ({
          id: String(file.id ?? ''),
          fileName: String(file.file_name ?? ''),
          fileUrl: String(file.view_url ?? ''),
          downloadUrl: String(file.download_url ?? file.view_url ?? ''),
          fileType: String(file.file_type ?? 'application/octet-stream'),
          uploadDate: String(file.upload_date ?? '')
        }))
      );
    } catch (error) {
      this.apiError.set(this.getApiErrorMessage(error, 'تعذر تحميل إعدادات الشركة.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  enterEditMode() {
    this.successMessage.set('');
    this.formData = { ...this._companySettings() };
    this.isEditMode.set(true);
  }

  cancelEdit() {
    this.apiError.set('');
    this.formData = { ...this._companySettings() };
    this.isEditMode.set(false);
  }

  async saveSettings() {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving.set(true);
    this.apiError.set('');
    this.successMessage.set('');

    try {
      const response = await firstValueFrom(
        this.http.post<SettingsResponse>(
          `${this.apiBaseUrl}/admin/company-settings`,
          {
            name: this.formData.companyName.trim(),
            address: this.formData.companyAddress.trim(),
            email: this.formData.email.trim(),
            phone: this.formData.phoneNumber.trim()
          },
          { headers: this.getAuthHeaders() }
        )
      );

      const company = response.data?.company;
      const updated: CompanySettings = {
        id: String(company?.id ?? this.formData.id),
        companyName: String(company?.name ?? this.formData.companyName),
        companyAddress: String(company?.address ?? this.formData.companyAddress),
        email: String(company?.email ?? this.formData.email),
        phoneNumber: String(company?.phone ?? this.formData.phoneNumber)
      };

      this._companySettings.set(updated);
      this.formData = { ...updated };
      this.isEditMode.set(false);
      this.successMessage.set('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      this.apiError.set(this.getApiErrorMessage(error, 'تعذر حفظ إعدادات الشركة.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  validateForm(): boolean {
    if (!this.formData.companyName.trim()) {
      this.apiError.set('يرجى إدخال اسم الشركة');
      return false;
    }
    if (!this.formData.companyAddress.trim()) {
      this.apiError.set('يرجى إدخال عنوان الشركة');
      return false;
    }
    if (!this.formData.email.trim() || !this.isValidEmail(this.formData.email)) {
      this.apiError.set('يرجى إدخال بريد إلكتروني صحيح');
      return false;
    }
    if (!this.formData.phoneNumber.trim()) {
      this.apiError.set('يرجى إدخال رقم الهاتف');
      return false;
    }
    return true;
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      void this.uploadFile();
    }
    input.value = '';
  }

  async uploadFile() {
    if (!this.selectedFile) {
      return;
    }

    this.isUploading.set(true);
    this.apiError.set('');
    this.successMessage.set('');

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile, this.selectedFile.name);
      formData.append('title', this.selectedFile.name.replace(/\.[^.]+$/, ''));

      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/admin/company-files`, formData, {
          headers: this.getAuthHeaders()
        })
      );

      this.selectedFile = null;
      this.successMessage.set('تم رفع الملف بنجاح');
      await this.loadSettings();
    } catch (error) {
      this.apiError.set(this.getApiErrorMessage(error, 'تعذر رفع الملف.'));
    } finally {
      this.isUploading.set(false);
    }
  }

  async viewFile(file: CompanyFile): Promise<void> {
    await this.openProtectedFile(file.fileUrl, false);
  }

  async downloadFile(file: CompanyFile): Promise<void> {
    await this.openProtectedFile(file.downloadUrl, true, file.fileName);
  }

  async deleteFile(fileId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الملف؟')) {
      return;
    }

    this.apiError.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/admin/company-files/${fileId}`, {
          headers: this.getAuthHeaders()
        })
      );
      this.successMessage.set('تم حذف الملف بنجاح');
      await this.loadSettings();
    } catch (error) {
      this.apiError.set(this.getApiErrorMessage(error, 'تعذر حذف الملف.'));
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) {
      return '—';
    }

    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }

    return dateString;
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

    const validationErrors = error.error?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
      const messages = Object.values(validationErrors as Record<string, unknown>)
        .flatMap((value) => Array.isArray(value) ? value.map(String) : [String(value)]);
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    return fallback;
  }

  private async openProtectedFile(url: string, download: boolean, fileName?: string): Promise<void> {
    this.apiError.set('');

    try {
      const blob = await firstValueFrom(
        this.http.get(url, {
          headers: this.getAuthHeaders(),
          responseType: 'blob'
        })
      );

      const objectUrl = URL.createObjectURL(blob);

      if (download) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName || 'document';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }

      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      this.apiError.set(this.getApiErrorMessage(error, 'تعذر فتح الملف.'));
    }
  }
}
