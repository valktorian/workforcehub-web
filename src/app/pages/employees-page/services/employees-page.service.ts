import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../../../core/api/api.config';
import {
  ApiResponse,
  AccountCommandResponse,
  CreateEmployeeRequest,
  EmployeeProfileResponse,
  ListEmployeesRequest,
  OnboardingAccount,
  PagedResponse,
  UpdateEmployeeEmploymentRequest,
  UpdateEmployeeRequest,
  UpdateEmployeeStatusRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class EmployeesPageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(request: ListEmployeesRequest): Promise<PagedResponse<EmployeeProfileResponse>> {
    const params = new HttpParams()
      .set('PageNumber', request.pageNumber)
      .set('PageSize', request.pageSize);

    return firstValueFrom(
      this.http.get<ApiResponse<PagedResponse<EmployeeProfileResponse>>>(
        apiUrl('/api/profiles', this.baseUrl),
        { params },
      ),
    ).then((response) => response.data);
  }

  getById(id: string): Promise<EmployeeProfileResponse> {
    return firstValueFrom(
      this.http.get<ApiResponse<EmployeeProfileResponse>>(
        apiUrl(`/api/profiles/${id}`, this.baseUrl),
      ),
    ).then((response) => response.data);
  }

  listAccounts(): Promise<OnboardingAccount[]> {
    const params = new HttpParams().set('PageNumber', 1).set('PageSize', 100);
    return firstValueFrom(
      this.http.get<ApiResponse<PagedResponse<OnboardingAccount>>>(
        apiUrl('/api/accounts', this.baseUrl),
        { params },
      ),
    ).then((response) => response.data.items);
  }

  createAccount(request: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }): Promise<OnboardingAccount> {
    return firstValueFrom(
      this.http.post<AccountCommandResponse>(apiUrl('/api/accounts', this.baseUrl), request),
    ).then((response) => ({
      id: response.accountId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      role: response.role,
    }));
  }

  linkAccount(profileId: string, accountId: string): Promise<EmployeeProfileResponse> {
    return firstValueFrom(
      this.http.post<EmployeeProfileResponse>(
        apiUrl(`/api/profiles/${profileId}/link-account`, this.baseUrl),
        { profileId, accountId },
      ),
    );
  }

  create(request: CreateEmployeeRequest, picture?: File): Promise<EmployeeProfileResponse> {
    if (!picture) {
      return firstValueFrom(
        this.http.post<EmployeeProfileResponse>(apiUrl('/api/profiles', this.baseUrl), request),
      );
    }

    const form = new FormData();
    form.append('Payload', JSON.stringify(request));
    form.append('ProfilePicture', picture);
    return firstValueFrom(
      this.http.post<EmployeeProfileResponse>(
        apiUrl('/api/profiles/with-picture', this.baseUrl),
        form,
      ),
    );
  }

  update(id: string, request: UpdateEmployeeRequest): Promise<EmployeeProfileResponse> {
    return firstValueFrom(
      this.http.put<EmployeeProfileResponse>(apiUrl(`/api/profiles/${id}`, this.baseUrl), request),
    );
  }

  updateEmployment(
    id: string,
    request: UpdateEmployeeEmploymentRequest,
  ): Promise<EmployeeProfileResponse> {
    return firstValueFrom(
      this.http.patch<EmployeeProfileResponse>(
        apiUrl(`/api/profiles/${id}/employment`, this.baseUrl),
        request,
      ),
    );
  }

  updateStatus(
    id: string,
    request: UpdateEmployeeStatusRequest,
  ): Promise<EmployeeProfileResponse> {
    return firstValueFrom(
      this.http.patch<EmployeeProfileResponse>(
        apiUrl(`/api/profiles/${id}/status`, this.baseUrl),
        request,
      ),
    );
  }

  uploadPicture(id: string, file: File): Promise<EmployeeProfileResponse> {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(
      this.http.post<EmployeeProfileResponse>(
        apiUrl(`/api/profiles/${id}/picture`, this.baseUrl),
        form,
      ),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(apiUrl(`/api/profiles/${id}`, this.baseUrl)),
    );
  }
}
