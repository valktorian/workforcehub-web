import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppInput, Icon, RoundButton } from 'mixology-ui';
import { apiUrl, API_BASE_URL } from '../../core/api/api.config';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileResponse, unwrapProfile } from '../../core/models/profile.model';

@Component({
  selector: 'app-profile-details-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AppInput, Icon, RoundButton],
  templateUrl: './profile-details-page.html',
  styleUrl: './profile-details-page.scss',
})
export class ProfileDetailsPage {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly user = this.authService.user;
  protected readonly profileResource = httpResource<ProfileResponse>(() =>
    apiUrl('/api/profiles/self', this.apiBaseUrl),
  );
  protected readonly profile = computed(() => unwrapProfile(this.profileResource.value()));

  protected readonly form = this.fb.group({
    personalEmail: ['', [Validators.email]],
    phoneNumber: [''],
    address: [''],
    dateOfBirth: [''],
  });

  protected readonly rows = computed(() => {
    const profile = this.profile();
    return [
      ['Employee number', profile?.employeeNumber],
      ['Work email', profile?.workEmail],
      ['Job title', profile?.jobTitle],
      ['Department', profile?.department],
      ['Employment type', profile?.employmentType],
      ['Hire date', this.formatDate(profile?.hireDate)],
      ['Organization role', profile?.organizationRole],
      ['Status', profile?.employmentStatus],
    ] as const;
  });

  constructor() {
    effect(() => {
      const profile = this.profile();
      if (!profile) return;

      this.form.patchValue(
        {
          personalEmail: profile.personalEmail ?? '',
          phoneNumber: profile.phoneNumber ?? '',
          address: profile.address ?? '',
          dateOfBirth: this.toDateInput(profile.dateOfBirth),
        },
        { emitEvent: false },
      );
    });
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    this.error.set(null);
    if (this.form.invalid || this.saving()) return;

    const user = this.user();
    const token = this.authService.token();
    if (!user || !token) return;

    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      const response = await fetch(apiUrl('/api/profiles/self/personal-info', this.apiBaseUrl), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: user.accountId,
          personalEmail: value.personalEmail || null,
          phoneNumber: value.phoneNumber || null,
          address: value.address || null,
          dateOfBirth: value.dateOfBirth ? new Date(value.dateOfBirth).toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error(await this.errorMessage(response));
      }

      this.profileResource.reload();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to update profile.');
    } finally {
      this.saving.set(false);
    }
  }

  private formatDate(value: string | null | undefined): string | null {
    if (!value) return null;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
  }

  private async errorMessage(response: Response): Promise<string> {
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      return problem.detail || problem.title || 'Unable to update profile.';
    } catch {
      return 'Unable to update profile.';
    }
  }
}
