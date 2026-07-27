import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Account, CreateAccountRequest, UpdateAccountRequest } from './models';
import { SettingsPageService } from './services/settings-page.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage implements OnInit {
  private readonly service = inject(SettingsPageService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly accounts = signal<Account[]>([]);
  protected readonly selected = signal<Account | null>(null);
  protected readonly editing = signal(false);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageNumber = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly roles = ['Employee', 'Manager', 'HRManager', 'HRAdmin'];
  protected readonly pageSize = 12;

  protected readonly filteredAccounts = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.accounts();
    return this.accounts().filter((account) =>
      [account.firstName, account.lastName, account.email, account.role].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  });

  protected readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['Employee', Validators.required],
    password: [''],
  });

  protected readonly passwordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(page = this.pageNumber()): Promise<void> {
    this.loading.set(true);
    this.clearFeedback();
    try {
      const result = await this.service.list(page, this.pageSize);
      this.accounts.set(result.items);
      this.pageNumber.set(result.pageNumber);
      this.totalPages.set(Math.max(1, result.totalPages));
      this.totalCount.set(result.totalCount);
    } catch {
      this.error.set('Unable to load accounts.');
    } finally {
      this.loading.set(false);
    }
  }

  protected select(account: Account): void {
    this.selected.set(account);
    this.editing.set(false);
    this.form.reset({
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      role: account.role,
      password: '',
    });
    this.passwordForm.reset();
    this.clearFeedback();
  }

  protected createAccount(): void {
    this.selected.set(null);
    this.editing.set(true);
    this.form.reset({ role: 'Employee' });
    this.passwordForm.reset();
    this.clearFeedback();
  }

  protected startEditing(): void {
    this.editing.set(true);
    this.clearFeedback();
  }

  protected cancelEditing(): void {
    const account = this.selected();
    if (account) this.select(account);
    else this.editing.set(false);
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    const selected = this.selected();
    const value = this.form.getRawValue();
    if (this.form.invalid || this.saving()) return;
    if (!selected && value.password.length < 8) {
      this.error.set('A password of at least 8 characters is required.');
      return;
    }

    this.saving.set(true);
    this.clearFeedback();
    try {
      if (selected) {
        const request: UpdateAccountRequest = {
          accountId: selected.id,
          firstName: value.firstName.trim(),
          lastName: value.lastName.trim(),
          email: value.email.trim(),
        };
        let updated = await this.service.update(selected.id, request);
        if (updated.role.toLowerCase() !== value.role.toLowerCase()) {
          updated = await this.service.updateRole(selected.id, value.role);
        }
        this.replace(updated);
        this.select(updated);
        this.message.set('Account updated.');
      } else {
        const request: CreateAccountRequest = {
          firstName: value.firstName.trim(),
          lastName: value.lastName.trim(),
          email: value.email.trim(),
          role: value.role,
          password: value.password,
        };
        const created = await this.service.create(request);
        this.accounts.update((accounts) => [created, ...accounts].slice(0, this.pageSize));
        this.totalCount.update((count) => count + 1);
        this.select(created);
        this.message.set('Account created. Complete the employee profile from Employees.');
      }
    } catch {
      this.error.set('Unable to save the account.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async resetPassword(): Promise<void> {
    const account = this.selected();
    this.passwordForm.markAllAsTouched();
    if (!account || this.passwordForm.invalid || this.saving()) return;
    if (!window.confirm(`Reset the password for ${account.email}?`)) return;

    this.saving.set(true);
    this.clearFeedback();
    try {
      await this.service.changePassword(account.id, this.passwordForm.getRawValue().password);
      this.passwordForm.reset();
      this.message.set('Password updated.');
    } catch {
      this.error.set('Unable to update the password.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const account = this.selected();
    if (!account || this.saving()) return;
    if (!window.confirm('Delete this account? Its employee profile will not be deleted.')) return;

    this.saving.set(true);
    this.clearFeedback();
    try {
      await this.service.delete(account.id);
      this.accounts.update((accounts) => accounts.filter((item) => item.id !== account.id));
      this.totalCount.update((count) => Math.max(0, count - 1));
      this.selected.set(null);
      this.editing.set(false);
      this.message.set('Account deleted. The employee profile was preserved.');
    } catch {
      this.error.set('Unable to delete the account.');
    } finally {
      this.saving.set(false);
    }
  }

  protected updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected displayName(account: Account): string {
    return `${account.firstName} ${account.lastName}`.trim() || account.email;
  }

  protected initials(account: Account): string {
    return (
      [account.firstName, account.lastName]
        .filter(Boolean)
        .map((value) => value[0]?.toUpperCase())
        .slice(0, 2)
        .join('') || 'A'
    );
  }

  private replace(updated: Account): void {
    this.accounts.update((accounts) =>
      accounts.map((account) => (account.id === updated.id ? updated : account)),
    );
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.message.set(null);
  }
}
