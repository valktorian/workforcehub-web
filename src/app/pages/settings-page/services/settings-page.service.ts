import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../../../core/api/api.config';
import {
  Account,
  AccountCommandResponse,
  ApiResponse,
  CreateAccountRequest,
  PagedResponse,
  UpdateAccountRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsPageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(pageNumber: number, pageSize: number): Promise<PagedResponse<Account>> {
    const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
    return firstValueFrom(
      this.http.get<ApiResponse<PagedResponse<Account>>>(apiUrl('/api/accounts', this.baseUrl), {
        params,
      }),
    ).then((response) => response.data);
  }

  create(request: CreateAccountRequest): Promise<Account> {
    return firstValueFrom(
      this.http.post<AccountCommandResponse>(apiUrl('/api/accounts', this.baseUrl), request),
    ).then((response) => this.normalize(response));
  }

  update(id: string, request: UpdateAccountRequest): Promise<Account> {
    return firstValueFrom(
      this.http.put<AccountCommandResponse>(apiUrl(`/api/accounts/${id}`, this.baseUrl), request),
    ).then((response) => this.normalize(response));
  }

  updateRole(id: string, role: string): Promise<Account> {
    return firstValueFrom(
      this.http.patch<AccountCommandResponse>(apiUrl(`/api/accounts/${id}/role`, this.baseUrl), {
        accountId: id,
        role,
      }),
    ).then((response) => this.normalize(response));
  }

  changePassword(id: string, password: string): Promise<void> {
    return firstValueFrom(
      this.http.patch<void>(apiUrl(`/api/accounts/${id}/password`, this.baseUrl), {
        accountId: id,
        password,
      }),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(apiUrl(`/api/accounts/${id}`, this.baseUrl)));
  }

  private normalize(response: AccountCommandResponse): Account {
    const { accountId, ...account } = response;
    return { id: accountId, ...account };
  }
}
