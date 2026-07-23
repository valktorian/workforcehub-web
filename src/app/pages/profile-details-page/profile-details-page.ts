import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileDetailsResponse } from './models';
import { ProfileDetailsPageService } from './services/profile-details-page.service';

@Component({
  selector: 'app-profile-details-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile-details-page.html',
  styleUrl: './profile-details-page.scss',
})
export class ProfileDetailsPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly service = inject(ProfileDetailsPageService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly profile = signal<ProfileDetailsResponse | null>(null);
  protected readonly user = this.authService.user;

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

  ngOnInit(): void {
    void this.loadProfile();
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    this.error.set(null);
    if (this.form.invalid || this.saving()) return;
    const user = this.user();
    if (!user) return;

    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      await this.service.updatePersonalInfo({
        accountId: user.accountId,
        personalEmail: value.personalEmail || null,
        phoneNumber: value.phoneNumber || null,
        address: value.address || null,
        dateOfBirth: value.dateOfBirth ? new Date(value.dateOfBirth).toISOString() : null,
      });
      await this.loadProfile();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to update profile.');
    } finally {
      this.saving.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const profile = await this.service.getSelf();
      this.profile.set(profile);
      if (profile) {
        this.form.patchValue(
          {
            personalEmail: profile.personalEmail ?? '',
            phoneNumber: profile.phoneNumber ?? '',
            address: profile.address ?? '',
            dateOfBirth: this.toDateInput(profile.dateOfBirth),
          },
          { emitEvent: false },
        );
      }
    } catch {
      this.profile.set(null);
      this.loadError.set('Unable to load profile details.');
    } finally {
      this.loading.set(false);
    }
  }

  private formatDate(value: string | null | undefined): string | null {
    if (!value) return null;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  }

  private toDateInput(value: string | null | undefined): string {
    return value ? new Date(value).toISOString().slice(0, 10) : '';
  }
}
