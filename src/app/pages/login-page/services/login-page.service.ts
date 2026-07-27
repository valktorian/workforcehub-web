import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../../../core/api/api.config';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiProblemResponse, LoginRequest, LoginResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class LoginPageService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = inject(API_BASE_URL);

  async login(request: LoginRequest): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(apiUrl('/api/auth/login', this.baseUrl), request),
      );
      this.auth.startSession(response);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const problem = error.error as ApiProblemResponse | null;
        throw new Error(problem?.detail || problem?.title || 'Unable to sign in.');
      }
      throw error;
    }
  }

  currentRole(): string {
    return this.auth.role() ?? '';
  }
}
