import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminLogEntry, AdminLogLevel, AdminLogsService, AdminLogSummary } from '../services/admin-logs.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-logs',
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './logs.component.html'
})
export class LogsComponent implements OnInit {
  private readonly api = inject(AdminLogsService);

  readonly entries = signal<AdminLogEntry[]>([]);
  readonly summary = signal<AdminLogSummary>(this.emptySummary());
  readonly fileName = signal('laravel.log');
  readonly selectedEntry = signal<AdminLogEntry | null>(null);
  readonly isLoading = signal(false);
  readonly apiError = signal('');
  readonly usingMockData = signal(false);

  levelFilter = 'all';
  searchQuery = '';
  limit = 150;

  readonly levels: Array<'all' | AdminLogLevel> = [
    'all',
    'emergency',
    'alert',
    'critical',
    'error',
    'warning',
    'notice',
    'info',
    'debug',
  ];

  readonly highPriorityCount = computed(() =>
    ['emergency', 'alert', 'critical', 'error'].reduce(
      (total, level) => total + (this.summary().byLevel[level as AdminLogLevel] ?? 0),
      0
    )
  );

  async ngOnInit(): Promise<void> {
    await this.loadLogs();
  }

  async loadLogs(): Promise<void> {
    this.isLoading.set(true);
    this.apiError.set('');

    try {
      const response = await this.api.fetchLogs({
        level: this.levelFilter,
        search: this.searchQuery,
        limit: this.limit,
      });

      if (response.entries.length === 0) {
        this.applyMockLogs();
      } else {
        this.entries.set(response.entries);
        this.summary.set(response.summary);
        this.fileName.set(response.file);
        this.usingMockData.set(false);
      }
    } catch (error) {
      this.applyMockLogs();
      this.apiError.set(this.api.getApiErrorMessage(error, 'تعذر تحميل السجلات من الخادم، تم عرض بيانات تجريبية.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters(): void {
    this.levelFilter = 'all';
    this.searchQuery = '';
    this.limit = 150;
    void this.loadLogs();
  }

  viewEntry(entry: AdminLogEntry): void {
    this.selectedEntry.set(entry);
  }

  closeEntry(): void {
    this.selectedEntry.set(null);
  }

  levelText(level: string): string {
    switch (level) {
      case 'emergency':
        return 'طارئ';
      case 'alert':
        return 'تنبيه';
      case 'critical':
        return 'حرج';
      case 'error':
        return 'خطأ';
      case 'warning':
        return 'تحذير';
      case 'notice':
        return 'ملاحظة';
      case 'info':
        return 'معلومة';
      case 'debug':
        return 'تصحيح';
      default:
        return 'الكل';
    }
  }

  levelBadgeClass(level: AdminLogLevel): string {
    switch (level) {
      case 'emergency':
      case 'alert':
      case 'critical':
      case 'error':
        return 'badge-error';
      case 'warning':
        return 'badge-warning';
      case 'notice':
      case 'info':
        return 'badge-info';
      case 'debug':
        return 'badge-ghost';
    }
  }

  private applyMockLogs(): void {
    const mock = this.api.mockLogs();
    this.entries.set(mock.entries);
    this.summary.set(mock.summary);
    this.fileName.set(mock.file);
    this.usingMockData.set(true);
  }

  private emptySummary(): AdminLogSummary {
    return {
      total: 0,
      byLevel: {
        emergency: 0,
        alert: 0,
        critical: 0,
        error: 0,
        warning: 0,
        notice: 0,
        info: 0,
        debug: 0,
      },
    };
  }
}
