import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminAuthService } from '../services/admin-auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AdminAuthService);

  menuItems = [
    { 
      path: '/admin/dashboard', 
      iconClass: 'fas fa-home', 
      label: 'لوحة التحكم',
      section: 'التشغيل'
    },
    { 
      path: '/admin/trips', 
      iconClass: 'fas fa-route', 
      label: 'الرحلات',
      section: 'التشغيل'
    },
    { 
      path: '/admin/vehicles', 
      iconClass: 'fas fa-bus', 
      label: 'المركبات',
      section: 'التشغيل'
    },
    { 
      path: '/admin/bookings', 
      iconClass: 'fas fa-calendar-check', 
      label: 'الحجوزات',
      section: 'التشغيل'
    },
    { 
      path: '/admin/reports', 
      iconClass: 'fas fa-file-alt', 
      label: 'التقارير',
      section: 'الإدارة'
    },
    { 
      path: '/admin/advertisements', 
      iconClass: 'fas fa-bullhorn', 
      label: 'الإعلانات',
      section: 'الإدارة'
    },
    { 
      path: '/admin/settings', 
      iconClass: 'fas fa-cog', 
      label: 'الإعدادات',
      section: 'الإدارة'
    }
  ];

  get pageTitle(): string {
    return this.menuItems.find((item) => this.router.url.startsWith(item.path))?.label ?? 'لوحة التحكم';
  }

  get userName(): string {
    return this.auth.getUser()?.name?.trim() || 'مدير الشركة';
  }

  get companyName(): string {
    const user = this.auth.getUser();
    return user?.company?.name ?? user?.transportCompany?.name ?? user?.transport_company?.name ?? 'إدارة شركة النقل';
  }

  closeNavigation(): void {
    if (typeof document === 'undefined') return;
    const navigation = document.getElementById('admin-navigation') as HTMLInputElement | null;
    if (navigation) navigation.checked = false;
  }

  logout(): void {
    this.auth.clearSession();
    void this.router.navigateByUrl('/admin/login');
  }
}
