import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginPageService } from './services/login-page.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly service = inject(LoginPageService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.error.set(null);
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.service.login({ email, password });
      const role = this.service.currentRole().toLowerCase();
      const destination = ['manager', 'hrmanager', 'hradmin'].includes(role)
        ? '/dashboard'
        : '/profile';
      await this.router.navigateByUrl(
        this.route.snapshot.queryParamMap.get('redirectTo') || destination,
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      this.submitting.set(false);
    }
  }
}
