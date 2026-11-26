import { Component, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminStateService } from '../services/admin-state.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-home',
  imports: [CommonModule, RouterModule, PageHeaderComponent, StatCardComponent],
  templateUrl: './admin-home.component.html',
  styleUrl: './admin-home.component.css'
})
export class AdminHomeComponent implements OnInit {
  constructor(public stateService: AdminStateService) {}

  ngOnInit(): void {
    void this.stateService.refreshDashboard();
  }

  // Computed values for display
  readonly formatEarnings = computed(() => {
    const amount = this.stateService.summaryStats().todayEarnings;
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

  readonly dayLabel = (day: string): string => {
    const labels: Record<string, string> = {
      monday: 'الاثنين',
      tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء',
      thursday: 'الخميس',
      friday: 'الجمعة',
      saturday: 'السبت',
      sunday: 'الأحد'
    };

    return labels[day.trim().toLowerCase()] ?? day;
  };

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

  // Expose Math for template
  Math = Math;
}
