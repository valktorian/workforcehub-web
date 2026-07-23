import { computed, Injectable, signal } from '@angular/core';
import { AuthSession, AuthUser } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'workforcehub.session.v1';
  private readonly session = signal<AuthSession | null>(this.readSession());
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

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

  constructor() {
    this.scheduleExpiration(this.session());
  }

  startSession(session: AuthSession): void {
    this.setSession(session);
  }

  logout(): void {
    this.setSession(null);
  }

  hasAnyRole(allowedRoles: readonly string[]): boolean {
    if (!allowedRoles.length) return true;
    const currentRole = this.role();
    return currentRole ? allowedRoles.includes(currentRole) : false;
  }

  private validSession(): AuthSession | null {
    const session = this.session();
    if (!session) return null;
    return new Date(session.expiresAt).getTime() > Date.now() ? session : null;
  }

  private setSession(session: AuthSession | null): void {
    this.session.set(session);
    this.scheduleExpiration(session);
    if (typeof window === 'undefined') return;

    if (session) {
      window.localStorage.setItem(this.storageKey, JSON.stringify(session));
      return;
    }

    window.localStorage.removeItem(this.storageKey);
  }

  private readSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return null;

      const session = JSON.parse(raw) as AuthSession;
      if (new Date(session.expiresAt).getTime() > Date.now()) return session;

      window.localStorage.removeItem(this.storageKey);
      return null;
    } catch {
      window.localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private scheduleExpiration(session: AuthSession | null): void {
    if (this.expirationTimer !== null) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }

    if (!session || typeof window === 'undefined') return;

    const delay = new Date(session.expiresAt).getTime() - Date.now();
    if (delay <= 0) return;

    this.expirationTimer = setTimeout(
      () => this.setSession(null),
      Math.min(delay, 2_147_483_647),
    );
  }
}
