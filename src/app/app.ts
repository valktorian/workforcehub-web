import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../node_modules/mixology-ui/src/lib/services/theme.service';
import { AuthService } from './core/auth/auth.service';

type AppTheme = 'default' | 'moon' | 'night-meteor';

type NavigationItem = {
  path: string;
  label: string;
  hint: string;
  icon: string;
  authOnly?: boolean;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly themeStorageKey = 'workforcehub.theme.v1';

  protected readonly exactMatchOptions = { exact: true };
  protected readonly defaultMatchOptions = { exact: false };
  protected readonly isLoggedIn = this.authService.isLoggedIn;
  protected readonly user = this.authService.user;
  protected readonly theme = signal<AppTheme>(this.readTheme());
  protected readonly navigationItems = computed(() =>
    this.allNavigationItems.filter((item) => !item.authOnly || this.isLoggedIn()),
  );

  private readonly allNavigationItems: NavigationItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      hint: 'App overview and key metrics',
      icon: 'dashboard',
      authOnly: true,
    },
    {
      path: '/profile',
      label: 'Profile',
      hint: 'Personal and employment record',
      icon: 'circle-user-solid-full',
      authOnly: true,
    },
    {
      path: '/employees',
      label: 'Employees',
      hint: 'People directory and staffing data',
      icon: 'users',
      authOnly: true,
    },
    {
      path: '/schedule',
      label: 'Schedule',
      hint: 'Shift planning and coverage view',
      icon: 'calendar',
      authOnly: true,
    },
    {
      path: '/settings',
      label: 'Settings',
      hint: 'Workspace preferences and setup',
      icon: 'settings',
      authOnly: true,
    },
  ];

  constructor() {
    this.applyTheme(this.theme());
  }

  protected nextTheme(): void {
    const current = this.theme();
    const next = current === 'default' ? 'moon' : current === 'moon' ? 'night-meteor' : 'default';
    this.theme.set(next);
    this.applyTheme(next);
    window.localStorage.setItem(this.themeStorageKey, next);
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  protected authAction(): void {
    if (this.isLoggedIn()) {
      this.logout();
      return;
    }

    this.router.navigateByUrl('/login');
  }

  private applyTheme(theme: AppTheme): void {
    if (theme === 'default') {
      this.themeService.clearTheme();
      return;
    }

    this.themeService.setTheme(theme);
  }

  private readTheme(): AppTheme {
    const stored = window.localStorage.getItem(this.themeStorageKey);
    return stored === 'moon' || stored === 'night-meteor' || stored === 'default'
      ? stored
      : 'night-meteor';
  }
}
