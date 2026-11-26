import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AdminAuthService } from '../../admin/services/admin-auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-super-admin-layout',
  imports: [RouterModule, CommonModule, NgOptimizedImage],
  templateUrl: './super-admin-layout.component.html',
  styleUrl: './super-admin-layout.component.css'
})
export class SuperAdminLayoutComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AdminAuthService);

  menuItems = [
    { path: '/super-admin/dashboard', iconClass: 'fas fa-home', label: 'الرئيسية', section: 'نظرة عامة' },
    { path: '/super-admin/companies', iconClass: 'fas fa-building', label: 'الشركات', section: 'نظرة عامة' },
    { path: '/super-admin/users', iconClass: 'fas fa-users', label: 'المستخدمين', section: 'نظرة عامة' },
    { path: '/super-admin/control-center', iconClass: 'fas fa-layer-group', label: 'مركز التحكم', section: 'الإشراف' },
    { path: '/super-admin/governance', iconClass: 'fas fa-user-shield', label: 'الحوكمة', section: 'الإشراف' },
    { path: '/super-admin/trips', iconClass: 'fas fa-route', label: 'الرحلات', section: 'العمليات' },
    { path: '/super-admin/bookings', iconClass: 'fas fa-calendar-check', label: 'الحجوزات', section: 'العمليات' },
    { path: '/super-admin/reports', iconClass: 'fas fa-file-alt', label: 'التقارير', section: 'العمليات' },
    { path: '/super-admin/advertisements', iconClass: 'fas fa-bullhorn', label: 'الإعلانات', section: 'العمليات' },
    { path: '/super-admin/complaints', iconClass: 'fas fa-exclamation-triangle', label: 'الشكاوى', section: 'العمليات' },
    { path: '/super-admin/settings', iconClass: 'fas fa-cog', label: 'الإعدادات', section: 'النظام' },
    { path: '/super-admin/logs', iconClass: 'fas fa-terminal', label: 'السجلات', section: 'النظام' }
  ];

  get pageTitle(): string {
    return this.menuItems.find((item) => this.router.url.startsWith(item.path))?.label ?? 'الرئيسية';
  }

  get userName(): string {
    return this.auth.getUser()?.name?.trim() || 'مدير النظام';
  }

  closeNavigation(): void {
    if (typeof document === 'undefined') return;
    const navigation = document.getElementById('super-admin-navigation') as HTMLInputElement | null;
    if (navigation) navigation.checked = false;
  }

  logout(): void {
    this.auth.clearSession();
    void this.router.navigateByUrl('/admin/login');
  }
}
