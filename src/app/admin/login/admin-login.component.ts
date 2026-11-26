import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuthService } from '../services/admin-auth.service';
import { resolveApiV1BaseUrl } from '../../shared/api-base';

interface LoginApiResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  token?: string;
  user?: unknown;
  data?: {
    token?: string;
    employee?: unknown;
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-login',
  imports: [CommonModule, FormsModule, NgOptimizedImage],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AdminAuthService);

  private readonly apiBaseUrl = resolveApiV1BaseUrl();

  login = '';
  password = '';

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl(this.auth.getHomeRoute());
    }
  }

  async onSubmit(): Promise<void> {
    const email = this.login.trim();
    const pass = this.password;

    if (!email || !pass) {
      this.errorMessage.set('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    try {
      const res = await firstValueFrom(
        this.http.post<LoginApiResponse>(`${this.apiBaseUrl}/auth/login`, {
          email,
          password: pass
        })
      );

      const token = res?.token ?? res?.data?.token;
      const user = res?.user ?? res?.data?.employee;
      const isSuccess = res?.status ?? res?.success ?? !!token;

      if (!isSuccess || !token) {
        this.errorMessage.set(res?.message?.trim() || 'فشل تسجيل الدخول.');
        return;
      }

      const userJson = user !== undefined ? JSON.stringify(user) : undefined;
      this.auth.setSession(token, userJson);
      void this.router.navigateByUrl(this.auth.getHomeRoute());
    } catch (err) {
      this.errorMessage.set(this.parseError(err));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private parseError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object' && body !== null) {
        const msg = (body as Record<string, unknown>)['message'];
        if (typeof msg === 'string' && msg.trim()) {
          return msg;
        }
      }

      if (error.status === 401 || error.status === 403) {
        return 'بيانات الدخول غير صحيحة.';
      }
    }

    return 'تعذر الاتصال بالخادم. حاول مرة أخرى.';
  }
}
