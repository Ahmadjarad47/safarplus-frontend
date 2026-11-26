import { Routes } from '@angular/router';
import { adminAuthGuard } from './admin/guards/admin-auth.guard';
import { superAdminAuthGuard } from './admin/guards/super-admin-auth.guard';

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/login/admin-login.component').then((m) => m.AdminLoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canMatch: [adminAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/admin-home/admin-home.component').then(m => m.AdminHomeComponent)
      },
      {
        path: 'trips',
        loadComponent: () => import('./admin/trips/trips.component').then(m => m.TripsComponent)
      },
      {
        path: 'vehicles',
        loadComponent: () => import('./admin/vehicles/vehicles.component').then(m => m.VehiclesComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./admin/bookings/bookings.component').then(m => m.BookingsComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./admin/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'advertisements',
        loadComponent: () => import('./admin/advertisements/advertisements.component').then(m => m.AdvertisementsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./admin/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: 'super-admin',
    loadComponent: () => import('./super-admin/super-admin-layout/super-admin-layout.component').then(m => m.SuperAdminLayoutComponent),
    canMatch: [superAdminAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./super-admin/super-admin-dashboard/super-admin-dashboard.component').then(m => m.SuperAdminDashboardComponent)
      },
      {
        path: 'dashbaord',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'companies',
        loadComponent: () => import('./super-admin/companies/companies.component').then(m => m.CompaniesComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./super-admin/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'control-center',
        loadComponent: () => import('./super-admin/control-center/control-center.component').then(m => m.ControlCenterComponent)
      },
      {
        path: 'governance',
        loadComponent: () => import('./super-admin/governance/governance-center.component').then(m => m.GovernanceCenterComponent)
      },
      {
        path: 'trips',
        loadComponent: () => import('./admin/trips/trips.component').then(m => m.TripsComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./admin/bookings/bookings.component').then(m => m.BookingsComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./admin/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'advertisements',
        loadComponent: () => import('./admin/advertisements/advertisements.component').then(m => m.AdvertisementsComponent)
      },
      {
        path: 'complaints',
        loadComponent: () => import('./super-admin/complaints/complaints.component').then(m => m.ComplaintsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./admin/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'logs',
        loadComponent: () => import('./super-admin/logs/logs.component').then(m => m.LogsComponent)
      }
    ]
  },
  {
    path: '',
    redirectTo: '/admin',
    pathMatch: 'full'
  }
];
