import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SelfProfileResponse } from './models';
import { ProfilePageService } from './services/profile-page.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly service = inject(ProfilePageService);

  protected readonly pictureUploading = signal(false);
  protected readonly pictureError = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly profile = signal<SelfProfileResponse | null>(null);
  protected readonly user = this.authService.user;

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

  ngOnInit(): void {
    void this.loadProfile();
  }

  protected async uploadPicture(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.pictureUploading()) return;
    this.pictureError.set(null);
    this.pictureUploading.set(true);
    try {
      await this.service.uploadPicture(file);
      await this.loadProfile();
      input.value = '';
    } catch {
      this.pictureError.set('Unable to upload the profile picture.');
    } finally {
      this.pictureUploading.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.profile.set(await this.service.getSelf());
    } catch {
      this.profile.set(null);
      this.loadError.set('Unable to load your profile.');
    } finally {
      this.loading.set(false);
    }
  }
}
