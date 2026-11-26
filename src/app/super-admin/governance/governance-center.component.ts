import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

type GovernanceTab = 'roles' | 'activity' | 'monitoring' | 'approvals' | 'subscriptions' | 'reports' | 'alerts';
type Severity = 'low' | 'medium' | 'high' | 'critical';
type WorkStatus = 'open' | 'pending' | 'approved' | 'rejected' | 'resolved' | 'paused' | 'active';

interface PermissionItem {
  key: string;
  label: string;
  category: string;
}

interface RoleItem {
  id: string;
  code: string;
  name: string;
  description: string;
  usersCount: number;
  active: boolean;
  permissions: string[];
}

interface ActivityEntry {
  id: string;
  user: string;
  role: string;
  action: string;
  target: string;
  ip: string;
  time: string;
  severity: Severity;
}

interface MonitorMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  trend: string;
  status: 'good' | 'watch' | 'danger';
  icon: string;
}

interface ApprovalItem {
  id: string;
  type: 'company' | 'ad';
  title: string;
  owner: string;
  submittedAt: string;
  status: WorkStatus;
  risk: Severity;
  notes: string;
}

interface SubscriptionItem {
  id: string;
  company: string;
  plan: string;
  status: WorkStatus;
  tripsLimit: number;
  adsLimit: number;
  usedTrips: number;
  usedAds: number;
  renewalDate: string;
  monthlyPrice: number;
}

interface ReportItem {
  id: string;
  type: 'user' | 'trip' | 'payment';
  source: string;
  subject: string;
  status: WorkStatus;
  priority: Severity;
  assignee: string;
  lastUpdate: string;
}

interface SmartAlert {
  id: string;
  title: string;
  body: string;
  trigger: string;
  suggestedAction: string;
  severity: Severity;
  status: 'active' | 'muted' | 'resolved';
  count: number;
}

@Component({
  selector: 'app-governance-center',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './governance-center.component.html'
})
export class GovernanceCenterComponent implements OnInit {
  private readonly storageKey = 'safarplus_super_admin_governance';

  readonly activeTab = signal<GovernanceTab>('roles');
  readonly notice = signal('');
  readonly liveMode = signal(true);

  readonly permissions = signal<PermissionItem[]>([
    { key: 'dashboard.view', label: 'عرض لوحة المراقبة', category: 'لوحة التحكم' },
    { key: 'users.manage', label: 'إدارة المستخدمين', category: 'المستخدمون' },
    { key: 'roles.manage', label: 'إدارة الصلاحيات', category: 'الصلاحيات' },
    { key: 'finance.view', label: 'عرض التقارير المالية', category: 'المالية' },
    { key: 'finance.refund', label: 'إدارة الاسترداد والدفع', category: 'المالية' },
    { key: 'companies.approve', label: 'قبول ورفض الشركات', category: 'الموافقات' },
    { key: 'ads.approve', label: 'قبول ورفض الإعلانات', category: 'الموافقات' },
    { key: 'reports.manage', label: 'إدارة البلاغات', category: 'الدعم' },
    { key: 'alerts.manage', label: 'إدارة التنبيهات الذكية', category: 'المراقبة' },
    { key: 'logs.view', label: 'عرض سجلات النظام', category: 'السجلات' }
  ]);

  readonly roles = signal<RoleItem[]>([]);
  readonly activity = signal<ActivityEntry[]>([]);
  readonly metrics = signal<MonitorMetric[]>([]);
  readonly approvals = signal<ApprovalItem[]>([]);
  readonly subscriptions = signal<SubscriptionItem[]>([]);
  readonly reports = signal<ReportItem[]>([]);
  readonly alerts = signal<SmartAlert[]>([]);

  selectedRoleId = 'support';
  activityFilter = '';
  reportFilter: 'all' | ReportItem['type'] = 'all';

  readonly selectedRole = computed(() => this.roles().find((role) => role.id === this.selectedRoleId) ?? this.roles()[0]);
  readonly openApprovals = computed(() => this.approvals().filter((item) => item.status === 'pending').length);
  readonly activeAlerts = computed(() => this.alerts().filter((item) => item.status === 'active').length);
  readonly openReports = computed(() => this.reports().filter((item) => item.status !== 'resolved').length);
  readonly watchedCompanies = computed(() => this.subscriptions().filter((item) => item.status === 'paused' || item.usedTrips >= item.tripsLimit * 0.85 || item.usedAds >= item.adsLimit * 0.85).length);
  readonly filteredActivity = computed(() => {
    const query = this.activityFilter.trim().toLowerCase();
    if (!query) return this.activity();

    return this.activity().filter((item) =>
      [item.user, item.role, item.action, item.target, item.ip].some((value) => value.toLowerCase().includes(query))
    );
  });
  readonly filteredReports = computed(() => {
    if (this.reportFilter === 'all') return this.reports();
    return this.reports().filter((report) => report.type === this.reportFilter);
  });

  ngOnInit(): void {
    this.loadState();
  }

  setTab(tab: GovernanceTab): void {
    this.activeTab.set(tab);
    this.notice.set('');
  }

  toggleRole(role: RoleItem): void {
    this.roles.update((rows) => rows.map((item) => item.id === role.id ? { ...item, active: !item.active } : item));
    this.persist('تم تحديث حالة الدور.');
  }

  togglePermission(role: RoleItem, permissionKey: string): void {
    const nextPermissions = role.permissions.includes(permissionKey)
      ? role.permissions.filter((key) => key !== permissionKey)
      : [...role.permissions, permissionKey];

    this.roles.update((rows) => rows.map((item) => item.id === role.id ? { ...item, permissions: nextPermissions } : item));
    this.persist('تم حفظ الصلاحيات.');
  }

  addActivitySnapshot(): void {
    const now = new Date();
    const entry: ActivityEntry = {
      id: `act-${Date.now()}`,
      user: 'System Monitor',
      role: 'Operations',
      action: 'فحص مباشر للوحة المراقبة',
      target: 'Live dashboard',
      ip: '127.0.0.1',
      time: now.toLocaleString('ar-SY'),
      severity: 'low'
    };

    this.activity.update((rows) => [entry, ...rows].slice(0, 12));
    this.metrics.update((rows) => rows.map((item) => item.id === 'errors' ? { ...item, value: '3', detail: 'تمت مراجعة آخر الأخطاء' } : item));
    this.persist('تم تحديث المراقبة المباشرة.');
  }

  setApprovalStatus(item: ApprovalItem, status: 'approved' | 'rejected'): void {
    this.approvals.update((rows) => rows.map((approval) => approval.id === item.id ? { ...approval, status } : approval));
    this.persist(status === 'approved' ? 'تمت الموافقة.' : 'تم الرفض.');
  }

  setSubscriptionStatus(item: SubscriptionItem, status: 'active' | 'paused'): void {
    this.subscriptions.update((rows) => rows.map((subscription) => subscription.id === item.id ? { ...subscription, status } : subscription));
    this.persist(status === 'active' ? 'تم تفعيل الاشتراك.' : 'تم إيقاف الاشتراك مؤقتاً.');
  }

  increaseSubscriptionLimit(item: SubscriptionItem, field: 'tripsLimit' | 'adsLimit'): void {
    this.subscriptions.update((rows) =>
      rows.map((subscription) =>
        subscription.id === item.id ? { ...subscription, [field]: Number(subscription[field]) + (field === 'tripsLimit' ? 20 : 5) } : subscription
      )
    );
    this.persist('تم تعديل حدود الاشتراك.');
  }

  resolveReport(item: ReportItem): void {
    this.reports.update((rows) => rows.map((report) => report.id === item.id ? { ...report, status: 'resolved', lastUpdate: 'الآن' } : report));
    this.persist('تم إغلاق البلاغ.');
  }

  escalateReport(item: ReportItem): void {
    this.reports.update((rows) => rows.map((report) => report.id === item.id ? { ...report, priority: 'critical', assignee: 'Operations Lead', lastUpdate: 'الآن' } : report));
    this.persist('تم تصعيد البلاغ.');
  }

  setAlertStatus(item: SmartAlert, status: SmartAlert['status']): void {
    this.alerts.update((rows) => rows.map((alert) => alert.id === item.id ? { ...alert, status } : alert));
    this.persist(status === 'resolved' ? 'تم حل التنبيه.' : 'تم تحديث التنبيه.');
  }

  resetDemoData(): void {
    this.removeStoredState();
    this.applySeedData();
    this.notice.set('تمت إعادة بيانات التحكم التجريبية.');
  }

  severityClass(severity: Severity): string {
    if (severity === 'critical') return 'badge-error';
    if (severity === 'high') return 'badge-warning';
    if (severity === 'medium') return 'badge-info';
    return 'badge-success';
  }

  statusClass(status: string): string {
    if (status === 'active' || status === 'approved' || status === 'resolved') return 'badge-success';
    if (status === 'pending' || status === 'open') return 'badge-info';
    if (status === 'paused') return 'badge-warning';
    return 'badge-error';
  }

  usagePercent(used: number, limit: number): number {
    if (!limit) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  }

  metricClass(status: MonitorMetric['status']): string {
    if (status === 'good') return 'text-success';
    if (status === 'watch') return 'text-warning';
    return 'text-error';
  }

  private persist(message: string): void {
    this.saveState();
    this.notice.set(message);
  }

  private loadState(): void {
    const saved = this.getStoredState();
    if (!saved) {
      this.applySeedData();
      return;
    }

    try {
      const state = JSON.parse(saved) as {
        roles?: RoleItem[];
        activity?: ActivityEntry[];
        metrics?: MonitorMetric[];
        approvals?: ApprovalItem[];
        subscriptions?: SubscriptionItem[];
        reports?: ReportItem[];
        alerts?: SmartAlert[];
      };
      this.roles.set(state.roles?.length ? state.roles : this.seedRoles());
      this.activity.set(state.activity?.length ? state.activity : this.seedActivity());
      this.metrics.set(state.metrics?.length ? state.metrics : this.seedMetrics());
      this.approvals.set(state.approvals?.length ? state.approvals : this.seedApprovals());
      this.subscriptions.set(state.subscriptions?.length ? state.subscriptions : this.seedSubscriptions());
      this.reports.set(state.reports?.length ? state.reports : this.seedReports());
      this.alerts.set(state.alerts?.length ? state.alerts : this.seedAlerts());
    } catch {
      this.applySeedData();
    }
  }

  private saveState(): void {
    if (!this.canUseBrowserStorage()) {
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify({
      roles: this.roles(),
      activity: this.activity(),
      metrics: this.metrics(),
      approvals: this.approvals(),
      subscriptions: this.subscriptions(),
      reports: this.reports(),
      alerts: this.alerts()
    }));
  }

  private getStoredState(): string | null {
    if (!this.canUseBrowserStorage()) {
      return null;
    }

    return window.localStorage.getItem(this.storageKey);
  }

  private removeStoredState(): void {
    if (!this.canUseBrowserStorage()) {
      return;
    }

    window.localStorage.removeItem(this.storageKey);
  }

  private canUseBrowserStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private applySeedData(): void {
    this.roles.set(this.seedRoles());
    this.activity.set(this.seedActivity());
    this.metrics.set(this.seedMetrics());
    this.approvals.set(this.seedApprovals());
    this.subscriptions.set(this.seedSubscriptions());
    this.reports.set(this.seedReports());
    this.alerts.set(this.seedAlerts());
    this.saveState();
  }

  private seedRoles(): RoleItem[] {
    return [
      {
        id: 'support',
        code: 'Support',
        name: 'الدعم الفني',
        description: 'يتابع المستخدمين والبلاغات والشكاوى بدون صلاحيات مالية حساسة.',
        usersCount: 6,
        active: true,
        permissions: ['dashboard.view', 'reports.manage', 'logs.view']
      },
      {
        id: 'finance',
        code: 'Finance',
        name: 'المالية',
        description: 'يراجع الدخل، المدفوعات، الاسترداد، وحدود الاشتراكات.',
        usersCount: 3,
        active: true,
        permissions: ['dashboard.view', 'finance.view', 'finance.refund', 'logs.view']
      },
      {
        id: 'operations',
        code: 'Operations',
        name: 'العمليات',
        description: 'يدير الرحلات، الشركات، الموافقات، والتنبيهات التشغيلية.',
        usersCount: 5,
        active: true,
        permissions: ['dashboard.view', 'companies.approve', 'ads.approve', 'alerts.manage', 'reports.manage']
      },
      {
        id: 'admin',
        code: 'Admin',
        name: 'مدير النظام',
        description: 'صلاحيات كاملة على المستخدمين والأدوار وإعدادات المنصة.',
        usersCount: 2,
        active: true,
        permissions: this.permissions().map((permission) => permission.key)
      }
    ];
  }

  private seedActivity(): ActivityEntry[] {
    return [
      { id: 'act-1', user: 'Hassan Admin', role: 'Admin', action: 'عدّل صلاحيات Finance', target: 'Roles', ip: '192.168.1.18', time: 'اليوم 10:42', severity: 'medium' },
      { id: 'act-2', user: 'Sara Support', role: 'Support', action: 'أغلق بلاغ دفع', target: 'PAY-2049', ip: '192.168.1.31', time: 'اليوم 10:12', severity: 'low' },
      { id: 'act-3', user: 'Nour Ops', role: 'Operations', action: 'وافق على إعلان جديد', target: 'AD-8821', ip: '192.168.1.44', time: 'اليوم 09:50', severity: 'low' },
      { id: 'act-4', user: 'System', role: 'Monitor', action: 'رصد ارتفاع فشل الدفع', target: 'Payment gateway', ip: '10.0.0.2', time: 'أمس 23:18', severity: 'high' }
    ];
  }

  private seedMetrics(): MonitorMetric[] {
    return [
      { id: 'todayBookings', label: 'حجوزات اليوم', value: '184', detail: '32 حجز خلال آخر ساعة', trend: '+18%', status: 'good', icon: 'fas fa-calendar-check' },
      { id: 'activeTrips', label: 'رحلات نشطة', value: '42', detail: '9 رحلات تغادر خلال ساعتين', trend: '+7%', status: 'good', icon: 'fas fa-route' },
      { id: 'lateCompanies', label: 'شركات متأخرة', value: '5', detail: 'لم تحدّث جداول الرحلات منذ 72 ساعة', trend: '+2', status: 'watch', icon: 'fas fa-building-circle-exclamation' },
      { id: 'errors', label: 'أخطاء حرجة', value: '4', detail: 'أغلبها من الدفع وتأكيد الحجز', trend: '-1', status: 'danger', icon: 'fas fa-triangle-exclamation' }
    ];
  }

  private seedApprovals(): ApprovalItem[] {
    return [
      { id: 'ap-1', type: 'company', title: 'شركة شام إكسبريس', owner: 'mohamad@safarplus.test', submittedAt: 'اليوم 09:30', status: 'pending', risk: 'medium', notes: 'تحتاج مراجعة السجل التجاري ورقم الهاتف.' },
      { id: 'ap-2', type: 'ad', title: 'عرض رحلات العيد', owner: 'Damascus Lines', submittedAt: 'اليوم 08:15', status: 'pending', risk: 'low', notes: 'صورة الإعلان واضحة والسعر مطابق للباقات.' },
      { id: 'ap-3', type: 'company', title: 'Aleppo Bus Network', owner: 'ops@abn.test', submittedAt: 'أمس 16:20', status: 'approved', risk: 'low', notes: 'تمت الموافقة بعد مطابقة الوثائق.' }
    ];
  }

  private seedSubscriptions(): SubscriptionItem[] {
    return [
      { id: 'sub-1', company: 'Damascus Lines', plan: 'Growth', status: 'active', tripsLimit: 160, adsLimit: 18, usedTrips: 132, usedAds: 15, renewalDate: '2026-08-15', monthlyPrice: 420000 },
      { id: 'sub-2', company: 'Sham Express', plan: 'Basic', status: 'paused', tripsLimit: 60, adsLimit: 5, usedTrips: 58, usedAds: 5, renewalDate: '2026-08-03', monthlyPrice: 150000 },
      { id: 'sub-3', company: 'Coastal Travel', plan: 'Enterprise', status: 'active', tripsLimit: 420, adsLimit: 60, usedTrips: 241, usedAds: 28, renewalDate: '2026-09-01', monthlyPrice: 1200000 }
    ];
  }

  private seedReports(): ReportItem[] {
    return [
      { id: 'rep-1', type: 'payment', source: 'Passenger #1282', subject: 'دفع مخصوم بدون تأكيد حجز', status: 'open', priority: 'critical', assignee: 'Finance', lastUpdate: 'منذ 12 دقيقة' },
      { id: 'rep-2', type: 'trip', source: 'Support', subject: 'رحلة تأخرت أكثر من 45 دقيقة', status: 'pending', priority: 'high', assignee: 'Operations', lastUpdate: 'منذ 33 دقيقة' },
      { id: 'rep-3', type: 'user', source: 'Driver Desk', subject: 'مستخدم يكرر إلغاء الحجوزات', status: 'open', priority: 'medium', assignee: 'Support', lastUpdate: 'اليوم 09:05' }
    ];
  }

  private seedAlerts(): SmartAlert[] {
    return [
      { id: 'al-1', title: 'ارتفاع الإلغاء', body: 'نسبة الإلغاء في خط دمشق - حلب وصلت إلى 18%.', trigger: 'إذا تجاوز الإلغاء 15% خلال 24 ساعة', suggestedAction: 'راجع أسعار الخط ومواعيد الرحلات والشركات الأكثر إلغاءً.', severity: 'high', status: 'active', count: 27 },
      { id: 'al-2', title: 'فشل دفع متكرر', body: 'بوابة الدفع أعادت 14 عملية فاشلة خلال آخر ساعة.', trigger: 'أكثر من 10 عمليات فاشلة في ساعة', suggestedAction: 'أبلغ المالية وفعّل قناة دفع بديلة مؤقتاً.', severity: 'critical', status: 'active', count: 14 },
      { id: 'al-3', title: 'شركة بدون رحلات', body: '3 شركات نشطة لم تضف أي رحلة منذ أسبوع.', trigger: 'شركة نشطة بدون رحلات لمدة 7 أيام', suggestedAction: 'أرسل تنبيه للشركة أو أوقف ظهورها في البحث.', severity: 'medium', status: 'muted', count: 3 }
    ];
  }
}
