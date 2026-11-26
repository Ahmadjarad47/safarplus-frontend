import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SuperAdminStateService } from '../services/super-admin-state.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, StatCardComponent],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrl: './super-admin-dashboard.component.css'
})
export class SuperAdminDashboardComponent implements OnInit {
  readonly isLoading = signal(true);
  readonly loadError = signal('');

  constructor(public stateService: SuperAdminStateService) {}

  ngOnInit(): void {
    void this.loadDashboard();
  }

  // Computed values for display
  readonly formatIncome = computed(() => {
    const amount = this.stateService.summaryStats().totalIncome;
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)} مليون`;
    }
    return amount.toLocaleString();
  });

  readonly maxChartValue = computed(() => {
    const activities = this.stateService.weeklyActivity();
    return Math.max(...activities.map(a => a.value), 100);
  });

  readonly chartBars = computed(() => {
    const activities = this.stateService.weeklyActivity();
    const maxValue = this.maxChartValue();
    return activities.map(activity => ({
      ...activity,
      height: (activity.value / maxValue) * 100
    }));
  });

  readonly statusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'badge-success';
      case 'pending':
        return 'badge-info';
      case 'canceled':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  readonly statusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'مؤكد';
      case 'pending':
        return 'قيد الانتظار';
      case 'canceled':
        return 'ملغي';
      default:
        return status;
    }
  };

  nextPage() {
    this.stateService.nextPage();
  }

  previousPage() {
    this.stateService.previousPage();
  }

  goToPage(page: number) {
    this.stateService.setCurrentPage(page);
  }

  private async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');

    try {
      await this.stateService.refreshTransportDashboardCounts();
    } catch {
      this.loadError.set('تعذر تحميل بيانات لوحة التحكم حالياً.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Expose Math for template
  Math = Math;
}



