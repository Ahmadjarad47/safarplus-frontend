import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminUser,
  AdminUserPayload,
  AdminUserStatus,
  UsersAdminService
} from '../services/users-admin.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  private readonly api = inject(UsersAdminService);

  readonly users = signal<AdminUser[]>([]);
  readonly searchQuery = signal('');
  readonly roleFilter = signal('all');
  readonly statusFilter = signal<'all' | AdminUserStatus>('all');
  readonly currentPage = signal(1);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly apiError = signal('');
  readonly usingMockData = signal(false);

  readonly showFormModal = signal(false);
  readonly showViewModal = signal(false);
  readonly showDeleteModal = signal(false);
  readonly selectedUser = signal<AdminUser | null>(null);
  readonly editingUser = signal<AdminUser | null>(null);

  readonly itemsPerPage = 7;
  readonly availableRoles = ['Super Admin', 'Admin', 'Transport', 'user', 'renter', 'lessor'];

  formData = this.emptyForm();

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return this.users().filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone.includes(this.searchQuery().trim());
      const matchesRole = role === 'all' || user.roles.includes(role) || user.role === role;
      const matchesStatus = status === 'all' || user.status === status;

      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredUsers().length / this.itemsPerPage))
  );

  readonly paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredUsers().slice(start, start + this.itemsPerPage);
  });

  readonly activeUsers = computed(() => this.users().filter((user) => user.status === 'active').length);
  readonly blockedUsers = computed(() => this.users().filter((user) => user.status === 'blocked').length);
  readonly adminUsers = computed(() =>
    this.users().filter((user) =>
      user.roles.some((role) => ['Super Admin', 'Admin'].includes(role))
    ).length
  );

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    this.apiError.set('');

    try {
      const users = await this.api.fetchUsers();
      if (users.length === 0) {
        this.users.set(this.mockUsers());
        this.usingMockData.set(true);
      } else {
        this.users.set(users);
        this.usingMockData.set(false);
      }
      this.currentPage.set(1);
    } catch (error) {
      this.users.set(this.mockUsers());
      this.usingMockData.set(true);
      this.apiError.set(this.api.getApiErrorMessage(error, 'تعذر تحميل المستخدمين من الخادم، تم عرض بيانات تجريبية.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  setRoleFilter(role: string): void {
    this.roleFilter.set(role);
    this.currentPage.set(1);
  }

  setStatusFilter(status: 'all' | AdminUserStatus): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  openCreateModal(): void {
    this.editingUser.set(null);
    this.formData = this.emptyForm();
    this.showFormModal.set(true);
  }

  openEditModal(user: AdminUser): void {
    this.editingUser.set(user);
    this.formData = {
      name: user.name,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      city: user.city,
      role: user.role || 'user',
      status: user.status,
      password: ''
    };
    this.showViewModal.set(false);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.editingUser.set(null);
    this.formData = this.emptyForm();
  }

  viewUser(user: AdminUser): void {
    this.selectedUser.set(user);
    this.showViewModal.set(true);
  }

  closeViewModal(): void {
    this.showViewModal.set(false);
    this.selectedUser.set(null);
  }

  openDeleteModal(user: AdminUser): void {
    this.selectedUser.set(user);
    this.showViewModal.set(false);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedUser.set(null);
  }

  async saveUser(): Promise<void> {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.apiError.set('');

    const editing = this.editingUser();
    const payload = this.toPayload();

    try {
      if (this.usingMockData()) {
        editing ? this.updateMockUser(editing.id, payload) : this.createMockUser(payload);
      } else if (editing) {
        await this.api.updateUser(editing.id, payload);
        await this.loadUsers();
      } else {
        await this.api.createUser(payload);
        await this.loadUsers();
      }

      this.closeFormModal();
    } catch (error) {
      this.apiError.set(this.api.getApiErrorMessage(error, 'فشل حفظ بيانات المستخدم.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async toggleStatus(user: AdminUser): Promise<void> {
    const nextStatus: AdminUserStatus = user.status === 'active' ? 'blocked' : 'active';
    this.isSubmitting.set(true);
    this.apiError.set('');

    try {
      if (this.usingMockData()) {
        this.patchLocalUser(user.id, { status: nextStatus });
      } else {
        await this.api.setUserStatus(user.id, nextStatus);
        await this.loadUsers();
      }
    } catch (error) {
      this.apiError.set(this.api.getApiErrorMessage(error, 'فشل تغيير حالة المستخدم.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async confirmDelete(): Promise<void> {
    const user = this.selectedUser();
    if (!user || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.apiError.set('');

    try {
      if (this.usingMockData()) {
        this.users.update((users) => users.filter((item) => item.id !== user.id));
      } else {
        await this.api.deleteUser(user.id);
        await this.loadUsers();
      }
      this.closeDeleteModal();
    } catch (error) {
      this.apiError.set(this.api.getApiErrorMessage(error, 'فشل حذف المستخدم.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  statusBadgeClass(status: AdminUserStatus): string {
    return status === 'active' ? 'badge-success' : 'badge-error';
  }

  statusText(status: AdminUserStatus): string {
    return status === 'active' ? 'نشط' : 'محظور';
  }

  roleBadgeClass(role: string): string {
    if (role === 'Super Admin') return 'badge-primary';
    if (role === 'Admin') return 'badge-info';
    if (role === 'Transport') return 'badge-secondary';
    return 'badge-ghost';
  }

  Math = Math;

  private toPayload(): AdminUserPayload {
    const payload: AdminUserPayload = {
      name: this.formData.name.trim(),
      first_name: this.formData.first_name?.trim(),
      last_name: this.formData.last_name?.trim(),
      email: this.formData.email?.trim(),
      phone: this.formData.phone?.trim(),
      address: this.formData.address?.trim(),
      city: this.formData.city?.trim(),
      role: this.formData.role,
      status: this.formData.status
    };

    if (this.formData.password?.trim()) {
      payload.password = this.formData.password.trim();
    }

    return payload;
  }

  private emptyForm(): AdminUserPayload {
    return {
      name: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      role: 'user',
      status: 'active',
      password: ''
    };
  }

  private createMockUser(payload: AdminUserPayload): void {
    const now = new Intl.DateTimeFormat('ar-SY').format(new Date());
    const user: AdminUser = {
      id: `mock-${Date.now()}`,
      name: payload.name,
      firstName: payload.first_name ?? '',
      lastName: payload.last_name ?? '',
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      address: payload.address ?? '',
      city: payload.city ?? '',
      role: payload.role,
      roles: [payload.role],
      status: payload.status,
      createdAt: now,
      updatedAt: now
    };
    this.users.update((users) => [user, ...users]);
  }

  private updateMockUser(id: string, payload: AdminUserPayload): void {
    this.patchLocalUser(id, {
      name: payload.name,
      firstName: payload.first_name ?? '',
      lastName: payload.last_name ?? '',
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      address: payload.address ?? '',
      city: payload.city ?? '',
      role: payload.role,
      roles: [payload.role],
      status: payload.status,
      updatedAt: new Intl.DateTimeFormat('ar-SY').format(new Date())
    });
  }

  private patchLocalUser(id: string, patch: Partial<AdminUser>): void {
    this.users.update((users) =>
      users.map((user) => (user.id === id ? { ...user, ...patch } : user))
    );
  }

  private mockUsers(): AdminUser[] {
    return [
      {
        id: 'mock-1',
        name: 'حسن الأبرش',
        firstName: 'حسن',
        lastName: 'الأبرش',
        email: 'hassan.admin@safarplus.net',
        phone: '+963944112233',
        address: 'دمشق، المزة',
        city: 'دمشق',
        role: 'Super Admin',
        roles: ['Super Admin'],
        status: 'active',
        createdAt: '٢١/٠٧/٢٠٢٦',
        updatedAt: '٢٦/٠٧/٢٠٢٦'
      },
      {
        id: 'mock-2',
        name: 'مها خليل',
        firstName: 'مها',
        lastName: 'خليل',
        email: 'maha.ops@safarplus.net',
        phone: '+963955667788',
        address: 'حلب، الجميلية',
        city: 'حلب',
        role: 'Admin',
        roles: ['Admin'],
        status: 'active',
        createdAt: '١٨/٠٧/٢٠٢٦',
        updatedAt: '٢٦/٠٧/٢٠٢٦'
      },
      {
        id: 'mock-3',
        name: 'عمر الحسن',
        firstName: 'عمر',
        lastName: 'الحسن',
        email: 'omar.transport@safarplus.net',
        phone: '+963933445566',
        address: 'إدلب، المركز',
        city: 'إدلب',
        role: 'Transport',
        roles: ['Transport'],
        status: 'active',
        createdAt: '١٥/٠٧/٢٠٢٦',
        updatedAt: '٢٤/٠٧/٢٠٢٦'
      },
      {
        id: 'mock-4',
        name: 'نور اليوسف',
        firstName: 'نور',
        lastName: 'اليوسف',
        email: 'nour.user@example.com',
        phone: '+963988776655',
        address: 'حمص، الوعر',
        city: 'حمص',
        role: 'user',
        roles: ['user'],
        status: 'blocked',
        createdAt: '١٢/٠٧/٢٠٢٦',
        updatedAt: '٢٣/٠٧/٢٠٢٦'
      },
      {
        id: 'mock-5',
        name: 'ليلى مراد',
        firstName: 'ليلى',
        lastName: 'مراد',
        email: 'layla@example.com',
        phone: '+963922334455',
        address: 'اللاذقية، المشروع السابع',
        city: 'اللاذقية',
        role: 'user',
        roles: ['user'],
        status: 'active',
        createdAt: '٠٨/٠٧/٢٠٢٦',
        updatedAt: '٢٠/٠٧/٢٠٢٦'
      }
    ];
  }
}
