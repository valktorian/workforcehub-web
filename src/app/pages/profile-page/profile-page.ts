import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage, IMAGE_ACCEPT, IMAGE_RULES, validateImageFile } from '../../core/media/image-upload';
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

  protected readonly imageAccept = IMAGE_ACCEPT;
  protected readonly imageRules = IMAGE_RULES;
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
    const invalid = await validateImageFile(file);
    if (invalid) {
      this.pictureError.set(invalid);
      input.value = '';
      return;
    }
    this.pictureUploading.set(true);
    try {
      this.profile.set(await this.service.uploadPicture(file));
    } catch (error) {
      this.pictureError.set(apiErrorMessage(error, 'Unable to upload the profile picture.'));
    } finally {
      input.value = '';
      this.pictureUploading.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.profile.set(await this.service.getSelf());
    } catch (error) {
      this.profile.set(null);
      this.loadError.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? 'Your account is active. HR still needs to create or link your employee profile.'
          : 'Unable to load your profile.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
