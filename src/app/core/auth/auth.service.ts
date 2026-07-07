import { Injectable, computed, inject, signal } from '@angular/core';
import { API_BASE_URL, apiUrl } from '../api/api.config';

export interface AuthUser {
  accountId: string;
  email: string;
  role: string;
  expiresAt: string;
}

interface LoginResponse {
  accessToken: string | null;
  expiresAt: string;
  accountId: string;
  email: string | null;
  role: string | null;
}

interface StoredSession extends AuthUser {
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly storageKey = 'workforcehub.session.v1';
  private readonly session = signal<StoredSession | null>(this.readSession());

  readonly user = computed<AuthUser | null>(() => {
    const session = this.validSession();
    if (!session) return null;

    return {
      accountId: session.accountId,
      email: session.email,
      role: session.role,
      expiresAt: session.expiresAt,
    };
  });
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly token = computed(() => this.validSession()?.accessToken ?? null);
  readonly role = computed(() => this.user()?.role ?? null);

  async login(email: string, password: string): Promise<void> {
    const response = await fetch(apiUrl('/api/auth/login', this.apiBaseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await this.errorMessage(response));
    }

    const data = (await response.json()) as LoginResponse;
    if (!data.accessToken || !data.email || !data.role) {
      throw new Error('The login response did not include a valid session.');
    }

    this.setSession({
      accessToken: data.accessToken,
      accountId: data.accountId,
      email: data.email,
      role: data.role,
      expiresAt: data.expiresAt,
    });
  }

  logout(): void {
    this.setSession(null);
  }

  hasAnyRole(allowedRoles: readonly string[]): boolean {
    if (!allowedRoles.length) return true;
    const currentRole = this.role();
    return currentRole ? allowedRoles.includes(currentRole) : false;
  }

  private validSession(): StoredSession | null {
    const session = this.session();
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      this.setSession(null);
      return null;
    }

    return session;
  }

  private setSession(session: StoredSession | null): void {
    this.session.set(session);
    if (typeof window === 'undefined') return;

    if (session) {
      window.localStorage.setItem(this.storageKey, JSON.stringify(session));
      return;
    }

    window.localStorage.removeItem(this.storageKey);
  }

  private readSession(): StoredSession | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      window.localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private async errorMessage(response: Response): Promise<string> {
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      return problem.detail || problem.title || 'Unable to sign in.';
    } catch {
      return 'Unable to sign in.';
    }
  }
}
