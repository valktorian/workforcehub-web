import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateEmployeeRequest,
  ApiProblemResponse,
  EmployeeProfileResponse,
  UpdateEmployeeEmploymentRequest,
  UpdateEmployeeRequest,
} from './models';
import { EmployeesPageService } from './services/employees-page.service';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './employees-page.html',
  styleUrl: './employees-page.scss',
})
export class EmployeesPage implements OnInit {
  private readonly service = inject(EmployeesPageService);
  private readonly fb = inject(NonNullableFormBuilder);

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
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(page = this.pageNumber()): Promise<void> {
    await this.run(async () => {
      const result = await this.service.list({ pageNumber: page, pageSize: this.pageSize });
      this.profiles.set(result.items);
      this.pageNumber.set(result.pageNumber);
      this.totalPages.set(Math.max(1, result.totalPages));
      this.totalCount.set(result.totalCount);
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
    this.form.reset({ employmentStatus: 'Active' });
    this.createPicture = null;
    this.clearFeedback();
  }

  protected edit(profile: EmployeeProfileResponse): void {
    this.selected.set(profile);
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
    });
    this.statusForm.setValue({ employmentStatus: profile.employmentStatus ?? 'Active' });
    this.clearFeedback();
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const selected = this.selected();
    const id = selected ? this.profileId(selected) : null;
    await this.run(async () => {
      if (id) {
        await this.service.update(id, this.updateRequest(id));
        this.message.set('Profile updated.');
      } else {
        await this.service.create(this.createRequest(), this.createPicture ?? undefined);
        this.message.set('Profile created.');
        this.newProfile();
      }
      await this.load();
    }, false, true);
  }

  protected async saveEmployment(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    await this.run(async () => {
      await this.service.updateEmployment(id, this.employmentRequest(id));
      this.message.set('Employment details updated.');
      await this.refreshSelected(id);
    }, false, true);
  }

  protected async saveStatus(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    await this.run(async () => {
      await this.service.updateStatus(id, {
        profileId: id,
        employmentStatus: this.statusForm.getRawValue().employmentStatus,
      });
      this.message.set('Employment status updated.');
      await this.refreshSelected(id);
    }, false, true);
  }

  protected async uploadPicture(): Promise<void> {
    const id = this.selectedId();
    if (!id || !this.profilePicture) return;
    await this.run(async () => {
      await this.service.uploadPicture(id, this.profilePicture!);
      this.profilePicture = null;
      this.message.set('Profile picture uploaded.');
      await this.refreshSelected(id);
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
      this.newProfile();
      this.message.set('Profile deleted.');
      await this.load();
    }, false, true);
  }

  protected onCreatePicture(event: Event): void {
    this.createPicture = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  protected onProfilePicture(event: Event): void {
    this.profilePicture = (event.target as HTMLInputElement).files?.[0] ?? null;
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

  private createRequest(): CreateEmployeeRequest {
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
      accountId: null,
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

  private async refreshSelected(id: string): Promise<void> {
    const profile = await this.service.getById(id);
    this.edit(profile);
    await this.load();
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
