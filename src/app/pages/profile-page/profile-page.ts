import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, RoundButton } from 'mixology-ui';
import { apiUrl, API_BASE_URL } from '../../core/api/api.config';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileResponse, unwrapProfile } from '../../core/models/profile.model';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [RouterLink, Icon, RoundButton],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);

  protected readonly user = this.authService.user;
  protected readonly profileResource = httpResource<ProfileResponse>(() =>
    apiUrl('/api/profiles/self', this.apiBaseUrl),
  );
  protected readonly profile = computed(() => unwrapProfile(this.profileResource.value()));

  protected readonly displayName = computed(() => {
    const profile = this.profile();
    const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
    return fullName || this.user()?.email || 'Profile';
  });

  protected readonly initials = computed(() =>
    this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'P',
  );
}
