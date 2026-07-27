import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CreateEmployeeRequest,
  ApiProblemResponse,
  EmployeeProfileResponse,
  OnboardingAccount,
  UpdateEmployeeEmploymentRequest,
  UpdateEmployeeRequest,
} from './models';
import { EmployeesPageService } from './services/employees-page.service';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './employees-page.html',
  styleUrl: './employees-page.scss',
})
export class EmployeesPage implements OnInit {
  private readonly service = inject(EmployeesPageService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);

  protected readonly profiles = signal<EmployeeProfileResponse[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly filteredProfiles = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.profiles();
    return this.profiles().filter((profile) =>
      [
        profile.firstName,
        profile.lastName,
        profile.employeeNumber,
        profile.workEmail,
        profile.personalEmail,
        profile.jobTitle,
        profile.department,
      ].some((value) => value?.toLowerCase().includes(query)),
    );
  });
  protected readonly selected = signal<EmployeeProfileResponse | null>(null);
  protected readonly editing = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly pageNumber = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = 12;
  protected readonly employmentStatuses = ['Active', 'OnLeave', 'Suspended', 'Inactive', 'Terminated'];
  protected readonly organizationRoles = ['Employee', 'Manager', 'HR', 'Admin'];
  protected readonly accountRoles = ['Employee', 'Manager', 'HRManager', 'HRAdmin'];
  protected readonly accounts = signal<OnboardingAccount[]>([]);
  protected readonly pendingAccount = signal<OnboardingAccount | null>(null);
  protected linkAccountId = '';
  protected createPicture: File | null = null;
  protected profilePicture: File | null = null;

  protected readonly statusForm = this.fb.group({ employmentStatus: ['Active'] });
  protected readonly form = this.fb.group({
    employeeNumber: [''],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    workEmail: ['', Validators.email],
    personalEmail: ['', Validators.email],
    phoneNumber: [''],
    address: [''],
    dateOfBirth: [''],
    jobTitle: [''],
    department: [''],
    employmentType: [''],
    hireDate: ['', Validators.required],
    organizationRole: [''],
    employmentStatus: ['Active'],
    accountEmail: ['', [Validators.email]],
    accountPassword: [''],
    accountRole: ['Employee'],
    existingAccountId: [''],
  });

  ngOnInit(): void {
    void this.load();
    void this.loadAccounts();
  }

  protected async load(page = this.pageNumber()): Promise<void> {
    await this.run(async () => {
      const result = await this.service.list({ pageNumber: page, pageSize: this.pageSize });
      this.profiles.set(result.items);
      this.pageNumber.set(result.pageNumber);
      this.totalPages.set(Math.max(1, result.totalPages));
      this.totalCount.set(result.totalCount);
      const requestedProfileId = this.route.snapshot.queryParamMap.get('profileId');
      const requestedProfile = result.items.find((profile) => profile.id === requestedProfileId);
      if (requestedProfile) await this.select(requestedProfile);
    }, true);
  }

  protected async select(profile: EmployeeProfileResponse): Promise<void> {
    const id = this.profileId(profile);
    if (!id) return;
    await this.run(async () => {
      const details = await this.service.getById(id);
      this.edit(details);
    });
  }

  protected newProfile(): void {
    this.selected.set(null);
    this.editing.set(true);
    this.form.reset({ employmentStatus: 'Active' });
    this.createPicture = null;
    this.pendingAccount.set(null);
    this.linkAccountId = '';
    this.clearFeedback();
  }

  protected edit(profile: EmployeeProfileResponse): void {
    this.selected.set(profile);
    this.editing.set(false);
    this.form.reset({
      employeeNumber: profile.employeeNumber ?? '',
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      workEmail: profile.workEmail ?? '',
      personalEmail: profile.personalEmail ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      address: profile.address ?? '',
      dateOfBirth: this.dateInput(profile.dateOfBirth),
      jobTitle: profile.jobTitle ?? '',
      department: profile.department ?? '',
      employmentType: profile.employmentType ?? '',
      hireDate: this.dateInput(profile.hireDate),
      organizationRole: this.organizationRoleValue(profile.organizationRole),
      employmentStatus: profile.employmentStatus ?? 'Active',
      accountEmail: '',
      accountPassword: '',
      accountRole: 'Employee',
      existingAccountId: '',
    });
    this.statusForm.setValue({ employmentStatus: profile.employmentStatus ?? 'Active' });
    this.clearFeedback();
  }

  protected startEditing(): void {
    this.editing.set(true);
    this.clearFeedback();
  }

  protected cancelEditing(): void {
    const profile = this.selected();
    if (profile) this.edit(profile);
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const selected = this.selected();
    const id = selected ? this.profileId(selected) : null;
    await this.run(async () => {
      if (id) {
        const updated = await this.service.update(id, this.updateRequest(id));
        this.replaceProfile(updated);
        this.edit(updated);
        this.message.set('Profile updated.');
      } else {
        const account = this.pendingAccount() ?? await this.createOnboardingAccount();
        this.pendingAccount.set(account);
        const created = await this.service.create(
          this.createRequest(account.id),
          this.createPicture ?? undefined,
        );
        this.newProfile();
        this.profiles.update((profiles) => [created, ...profiles].slice(0, this.pageSize));
        this.totalCount.update((count) => count + 1);
        this.message.set('Account and employee profile created.');
      }
    }, false, true);
  }

  protected async saveEmployment(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    await this.run(async () => {
      const updated = await this.service.updateEmployment(id, this.employmentRequest(id));
      this.replaceProfile(updated);
      this.edit(updated);
      this.message.set('Employment details updated.');
    }, false, true);
  }

  protected async saveStatus(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    await this.run(async () => {
      const updated = await this.service.updateStatus(id, {
        profileId: id,
        employmentStatus: this.statusForm.getRawValue().employmentStatus,
      });
      this.replaceProfile(updated);
      this.edit(updated);
      this.message.set('Employment status updated.');
    }, false, true);
  }

  protected async uploadPicture(): Promise<void> {
    const id = this.selectedId();
    if (!id || !this.profilePicture) return;
    await this.run(async () => {
      const updated = await this.service.uploadPicture(id, this.profilePicture!);
      this.profilePicture = null;
      this.replaceProfile(updated);
      this.edit(updated);
      this.message.set('Profile picture uploaded.');
    }, false, true);
  }

  protected async linkAccount(): Promise<void> {
    const profile = this.selected();
    if (!profile || !this.linkAccountId || this.saving()) return;
    await this.run(async () => {
      const updated = await this.service.linkAccount(profile.id, this.linkAccountId);
      this.replaceProfile(updated);
      this.edit(updated);
      this.message.set('Account linked to the employee profile.');
    }, false, true);
  }

  protected updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected async remove(): Promise<void> {
    const id = this.selectedId();
    if (!id || !window.confirm('Delete this profile permanently?')) return;
    await this.run(async () => {
      await this.service.delete(id);
      this.profiles.update((profiles) => profiles.filter((profile) => profile.id !== id));
      this.totalCount.update((count) => Math.max(0, count - 1));
      this.newProfile();
      this.message.set('Profile deleted.');
    }, false, true);
  }

  protected onCreatePicture(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.createPicture = this.validImage(input);
  }

  protected onProfilePicture(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.profilePicture = this.validImage(input);
  }

  protected profileId(profile: EmployeeProfileResponse): string {
    return profile.id;
  }

  protected displayName(profile: EmployeeProfileResponse): string {
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Unnamed profile';
  }

  protected initials(profile: EmployeeProfileResponse): string {
    return (
      [profile.firstName, profile.lastName]
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part?.[0]?.toUpperCase())
        .join('') || 'P'
    );
  }

  protected isKnownOrganizationRole(role: string | null | undefined): boolean {
    return !!role && this.organizationRoles.some((option) => option.toLowerCase() === role.toLowerCase());
  }

  private selectedId(): string | null {
    const profile = this.selected();
    return profile ? this.profileId(profile) : null;
  }

  private validImage(input: HTMLInputElement): File | null {
    const file = input.files?.[0] ?? null;
    if (file && !['image/jpeg', 'image/png'].includes(file.type)) {
      this.error.set('Only JPG, JPEG, and PNG images are supported.');
      input.value = '';
      return null;
    }

    this.error.set(null);
    return file;
  }

  private createRequest(accountId: string | null = null): CreateEmployeeRequest {
    const value = this.form.getRawValue();
    return {
      employeeNumber: value.employeeNumber.trim(),
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      workEmail: value.workEmail.trim(),
      personalEmail: this.nullable(value.personalEmail),
      phoneNumber: this.nullable(value.phoneNumber),
      address: this.nullable(value.address),
      dateOfBirth: this.iso(value.dateOfBirth),
      jobTitle: value.jobTitle.trim(),
      department: value.department.trim(),
      managerProfileId: null,
      employmentType: value.employmentType.trim(),
      hireDate: this.iso(value.hireDate) ?? new Date().toISOString(),
      organizationRole: value.organizationRole.trim(),
      employmentStatus: value.employmentStatus.trim(),
      accountId,
      profilePictureUrl: null,
    };
  }

  private updateRequest(id: string): UpdateEmployeeRequest {
    const value = this.form.getRawValue();
    return {
      profileId: id,
      employeeNumber: value.employeeNumber.trim(),
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      workEmail: value.workEmail.trim(),
      personalEmail: this.nullable(value.personalEmail),
      phoneNumber: this.nullable(value.phoneNumber),
      address: this.nullable(value.address),
      dateOfBirth: this.iso(value.dateOfBirth),
      jobTitle: value.jobTitle.trim(),
      department: value.department.trim(),
      managerProfileId: this.selected()?.managerProfileId ?? null,
      employmentType: value.employmentType.trim(),
      hireDate: this.iso(value.hireDate) ?? new Date().toISOString(),
      organizationRole: value.organizationRole.trim(),
    };
  }

  private employmentRequest(id: string): UpdateEmployeeEmploymentRequest {
    const value = this.form.getRawValue();
    return {
      profileId: id,
      jobTitle: value.jobTitle.trim(),
      department: value.department.trim(),
      managerProfileId: this.selected()?.managerProfileId ?? null,
      employmentType: value.employmentType.trim(),
      hireDate: this.iso(value.hireDate) ?? new Date().toISOString(),
      organizationRole: value.organizationRole.trim(),
    };
  }

  private replaceProfile(updated: EmployeeProfileResponse): void {
    this.profiles.update((profiles) =>
      profiles.map((profile) => profile.id === updated.id ? updated : profile),
    );
  }

  private async loadAccounts(): Promise<void> {
    try {
      const accounts = await this.service.listAccounts();
      this.accounts.set(accounts);
      const requestedAccountId = this.route.snapshot.queryParamMap.get('accountId');
      if (requestedAccountId && accounts.some((account) => account.id === requestedAccountId)) {
        this.newProfile();
        this.form.patchValue({ existingAccountId: requestedAccountId });
      }
    } catch {
      this.accounts.set([]);
    }
  }

  private createOnboardingAccount(): Promise<OnboardingAccount> {
    const value = this.form.getRawValue();
    if (value.existingAccountId) {
      const existing = this.accounts().find((account) => account.id === value.existingAccountId);
      if (existing) return Promise.resolve(existing);
    }
    if (!value.accountEmail.trim() || value.accountPassword.length < 8) {
      throw new Error('Account email and a password of at least 8 characters are required.');
    }
    return this.service.createAccount({
      email: value.accountEmail.trim(),
      password: value.accountPassword,
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      role: value.accountRole,
    });
  }

  private async run(action: () => Promise<void>, loading = false, saving = false): Promise<void> {
    this.clearFeedback();
    if (loading) this.loading.set(true);
    if (saving) this.saving.set(true);
    try {
      await action();
    } catch (error) {
      this.error.set(this.errorText(error instanceof Error ? error : null));
    } finally {
      if (loading) this.loading.set(false);
      if (saving) this.saving.set(false);
    }
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.message.set(null);
  }

  private errorText(error: Error | null): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiProblemResponse | null;
      return body?.detail || body?.title || 'The profile request failed.';
    }
    return error?.message || 'The profile request failed.';
  }

  private nullable(value: string): string | null {
    return value.trim() || null;
  }

  private iso(value: string): string | null {
    return value ? new Date(value).toISOString() : null;
  }

  private dateInput(value: string | null | undefined): string {
    return value ? new Date(value).toISOString().slice(0, 10) : '';
  }

  private organizationRoleValue(value: string | null | undefined): string {
    if (!value) return '';
    return this.organizationRoles.find((role) => role.toLowerCase() === value.toLowerCase()) ?? value;
  }
}
