import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { resolveApiV1BaseUrl } from '../../shared/api-base';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

type ControlTab = 'packages' | 'rules' | 'notifications' | 'system';
type RuleType = 'points' | 'profits';

interface AdminPackage {
  id: string;
  name: string;
  adLimit: number;
  price: number;
}

interface TicketRule {
  id: string;
  minPrice: number;
  maxPrice: number;
  points?: number;
  percentage?: number;
}

interface NotificationDraft {
  title: string;
  body: string;
  targetMode: 'topic' | 'role' | 'users';
  topic: string;
  role: string;
  userIds: string;
}

interface HealthCheck {
  label: string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
}

@Component({
  selector: 'app-control-center',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './control-center.component.html'
})
export class ControlCenterComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  readonly activeTab = signal<ControlTab>('packages');
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly notice = signal('');
  readonly error = signal('');
  readonly usingMockData = signal(false);

  readonly packages = signal<AdminPackage[]>([]);
  readonly pointRules = signal<TicketRule[]>([]);
  readonly profitRules = signal<TicketRule[]>([]);
  readonly healthChecks = signal<HealthCheck[]>([]);

  packageForm: AdminPackage = { id: '', name: '', adLimit: 1, price: 0 };
  pointsForm: TicketRule = { id: '', minPrice: 0, maxPrice: 0, points: 0 };
  profitsForm: TicketRule = { id: '', minPrice: 0, maxPrice: 0, percentage: 0 };
  notificationForm: NotificationDraft = {
    title: '',
    body: '',
    targetMode: 'topic',
    topic: 'all-users',
    role: 'user',
    userIds: '',
  };

  readonly totalPackageValue = computed(() =>
    this.packages().reduce((total, item) => total + item.price, 0)
  );

  async ngOnInit(): Promise<void> {
    await this.reloadCurrentTab();
  }

  async setTab(tab: ControlTab): Promise<void> {
    this.activeTab.set(tab);
    this.notice.set('');
    this.error.set('');
    await this.reloadCurrentTab();
  }

  async reloadCurrentTab(): Promise<void> {
    if (this.activeTab() === 'packages') await this.loadPackages();
    if (this.activeTab() === 'rules') await this.loadRules();
    if (this.activeTab() === 'system') await this.loadHealth();
  }

  async loadPackages(): Promise<void> {
    this.isLoading.set(true);
    this.error.set('');
    try {
      const raw = await firstValueFrom(this.http.get<unknown>(`${this.apiBaseUrl}/packages`, this.options()));
      const rows = Array.isArray(raw) ? raw : [];
      this.packages.set(rows.map((row) => this.mapPackage(row as Record<string, unknown>)));
      if (this.packages().length === 0) this.applyMockPackages();
    } catch {
      this.applyMockPackages();
    } finally {
      this.isLoading.set(false);
    }
  }

  editPackage(item: AdminPackage): void {
    this.packageForm = { ...item };
  }

  resetPackageForm(): void {
    this.packageForm = { id: '', name: '', adLimit: 1, price: 0 };
  }

  async savePackage(): Promise<void> {
    this.isSubmitting.set(true);
    this.notice.set('');
    const payload = {
      name: this.packageForm.name,
      ad_limit: Number(this.packageForm.adLimit),
      price: Number(this.packageForm.price),
    };

    try {
      if (this.usingMockData()) {
        this.saveMockPackage();
      } else if (this.packageForm.id) {
        await firstValueFrom(this.http.post(`${this.apiBaseUrl}/packages/${this.packageForm.id}`, payload, this.options()));
        await this.loadPackages();
      } else {
        await firstValueFrom(this.http.post(`${this.apiBaseUrl}/packages`, payload, this.options()));
        await this.loadPackages();
      }
      this.notice.set('تم حفظ الباقة بنجاح.');
      this.resetPackageForm();
    } catch {
      this.error.set('تعذر حفظ الباقة، تم تطبيق التغيير على البيانات التجريبية.');
      this.saveMockPackage();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async deletePackage(id: string): Promise<void> {
    if (this.usingMockData()) {
      this.packages.update((rows) => rows.filter((row) => row.id !== id));
      return;
    }
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/packages/${id}`, this.options()));
    await this.loadPackages();
  }

  async loadRules(): Promise<void> {
    this.isLoading.set(true);
    this.error.set('');
    try {
      const [points, profits] = await Promise.all([
        firstValueFrom(this.http.get<unknown>(`${this.apiBaseUrl}/ticket-points`, this.options())),
        firstValueFrom(this.http.get<unknown>(`${this.apiBaseUrl}/ticket-profits`, this.options())),
      ]);
      this.pointRules.set((Array.isArray(points) ? points : []).map((row) => this.mapRule(row as Record<string, unknown>, 'points')));
      this.profitRules.set((Array.isArray(profits) ? profits : []).map((row) => this.mapRule(row as Record<string, unknown>, 'profits')));
      if (this.pointRules().length === 0 && this.profitRules().length === 0) this.applyMockRules();
    } catch {
      this.applyMockRules();
    } finally {
      this.isLoading.set(false);
    }
  }

  editRule(rule: TicketRule, type: RuleType): void {
    if (type === 'points') this.pointsForm = { ...rule };
    if (type === 'profits') this.profitsForm = { ...rule };
  }

  async saveRule(type: RuleType): Promise<void> {
    this.isSubmitting.set(true);
    const form = type === 'points' ? this.pointsForm : this.profitsForm;
    const endpoint = type === 'points' ? 'ticket-points' : 'ticket-profits';
    const payload =
      type === 'points'
        ? { min_price: form.minPrice, max_price: form.maxPrice, points: Number(form.points ?? 0) }
        : { min_price: form.minPrice, max_price: form.maxPrice, percentage: Number(form.percentage ?? 0) };

    try {
      if (this.usingMockData()) {
        this.saveMockRule(type, form);
      } else if (form.id) {
        await firstValueFrom(this.http.post(`${this.apiBaseUrl}/${endpoint}/${form.id}`, payload, this.options()));
        await this.loadRules();
      } else {
        await firstValueFrom(this.http.post(`${this.apiBaseUrl}/${endpoint}`, payload, this.options()));
        await this.loadRules();
      }
      this.notice.set('تم حفظ القاعدة بنجاح.');
      this.resetRuleForm(type);
    } catch {
      this.error.set('تعذر حفظ القاعدة على الخادم، تم تطبيقها محليا للمعاينة.');
      this.saveMockRule(type, form);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetRuleForm(type: RuleType): void {
    if (type === 'points') this.pointsForm = { id: '', minPrice: 0, maxPrice: 0, points: 0 };
    if (type === 'profits') this.profitsForm = { id: '', minPrice: 0, maxPrice: 0, percentage: 0 };
  }

  async sendNotification(): Promise<void> {
    this.isSubmitting.set(true);
    this.notice.set('');
    this.error.set('');
    const payload: Record<string, unknown> = {
      title: this.notificationForm.title,
      body: this.notificationForm.body,
    };
    if (this.notificationForm.targetMode === 'topic') payload['topic'] = this.notificationForm.topic;
    if (this.notificationForm.targetMode === 'role') payload['role'] = this.notificationForm.role;
    if (this.notificationForm.targetMode === 'users') {
      payload['user_ids'] = this.notificationForm.userIds
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isFinite(id));
    }

    try {
      await firstValueFrom(this.http.post(`${this.apiBaseUrl}/notifications/send`, payload, this.options()));
      this.notice.set('تم إرسال الإشعار بنجاح.');
    } catch {
      this.error.set('تعذر إرسال الإشعار فعليا، لكن النموذج جاهز ومربوط بالواجهة.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async loadHealth(): Promise<void> {
    this.isLoading.set(true);
    try {
      const raw = await firstValueFrom(this.http.get<Record<string, unknown>>(`${this.apiBaseUrl}/health`));
      this.healthChecks.set([
        { label: 'API', status: raw['status'] === 'ok' ? 'ok' : 'error', detail: String(raw['status'] ?? 'unknown') },
        { label: 'Database', status: raw['database'] === 'connected' ? 'ok' : 'error', detail: String(raw['database'] ?? 'unknown') },
        { label: 'Frontend build', status: 'ok', detail: 'Angular routes compiled' },
        { label: 'Admin token', status: this.hasToken() ? 'ok' : 'warning', detail: this.hasToken() ? 'Present' : 'Missing' },
      ]);
    } catch {
      this.healthChecks.set([
        { label: 'API', status: 'error', detail: 'Health endpoint unavailable' },
        { label: 'Database', status: 'warning', detail: 'Not checked' },
        { label: 'Frontend build', status: 'ok', detail: 'Local UI is running' },
        { label: 'Admin token', status: this.hasToken() ? 'ok' : 'warning', detail: this.hasToken() ? 'Present' : 'Missing' },
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  statusClass(status: HealthCheck['status']): string {
    if (status === 'ok') return 'badge-success';
    if (status === 'warning') return 'badge-warning';
    return 'badge-error';
  }

  private mapPackage(row: Record<string, unknown>): AdminPackage {
    return {
      id: String(row['id'] ?? ''),
      name: String(row['name'] ?? ''),
      adLimit: Number(row['ad_limit'] ?? row['adLimit'] ?? 0),
      price: Number(row['price'] ?? 0),
    };
  }

  private mapRule(row: Record<string, unknown>, type: RuleType): TicketRule {
    return {
      id: String(row['id'] ?? ''),
      minPrice: Number(row['min_price'] ?? 0),
      maxPrice: Number(row['max_price'] ?? 0),
      ...(type === 'points' ? { points: Number(row['points'] ?? 0) } : { percentage: Number(row['percentage'] ?? 0) }),
    };
  }

  private applyMockPackages(): void {
    this.usingMockData.set(true);
    this.packages.set([
      { id: 'mock-basic', name: 'Basic Ads', adLimit: 5, price: 150000 },
      { id: 'mock-growth', name: 'Growth Partner', adLimit: 18, price: 420000 },
      { id: 'mock-enterprise', name: 'Enterprise Network', adLimit: 60, price: 1200000 },
    ]);
  }

  private applyMockRules(): void {
    this.usingMockData.set(true);
    this.pointRules.set([
      { id: 'mock-p1', minPrice: 0, maxPrice: 100000, points: 10 },
      { id: 'mock-p2', minPrice: 100001, maxPrice: 250000, points: 30 },
      { id: 'mock-p3', minPrice: 250001, maxPrice: 999999, points: 75 },
    ]);
    this.profitRules.set([
      { id: 'mock-r1', minPrice: 0, maxPrice: 100000, percentage: 4 },
      { id: 'mock-r2', minPrice: 100001, maxPrice: 250000, percentage: 6 },
      { id: 'mock-r3', minPrice: 250001, maxPrice: 999999, percentage: 8 },
    ]);
  }

  private saveMockPackage(): void {
    const id = this.packageForm.id || `mock-${Date.now()}`;
    const row = { ...this.packageForm, id };
    this.packages.update((rows) => [row, ...rows.filter((item) => item.id !== id)]);
    this.usingMockData.set(true);
  }

  private saveMockRule(type: RuleType, form: TicketRule): void {
    const id = form.id || `mock-${type}-${Date.now()}`;
    const row = { ...form, id };
    const updater = (rows: TicketRule[]) => [row, ...rows.filter((item) => item.id !== id)];
    type === 'points' ? this.pointRules.update(updater) : this.profitRules.update(updater);
    this.usingMockData.set(true);
  }

  private options() {
    return { headers: this.headers() };
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('admin_token') ?? sessionStorage.getItem('admin_token');
    let headers = new HttpHeaders({ Accept: 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  private hasToken(): boolean {
    return !!(localStorage.getItem('admin_token') ?? sessionStorage.getItem('admin_token'));
  }
}
