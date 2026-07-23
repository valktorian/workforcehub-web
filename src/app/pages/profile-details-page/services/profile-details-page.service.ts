import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../../../core/api/api.config';
import {
  ApiResponse,
  ProfileDetailsResponse,
  UpdatePersonalInfoRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ProfileDetailsPageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getSelf(): Promise<ProfileDetailsResponse> {
    return firstValueFrom(
      this.http.get<ApiResponse<ProfileDetailsResponse>>(
        apiUrl('/api/profiles/self', this.baseUrl),
      ),
    ).then((response) => response.data);
  }

  updatePersonalInfo(request: UpdatePersonalInfoRequest): Promise<ProfileDetailsResponse> {
    return firstValueFrom(
      this.http.patch<ProfileDetailsResponse>(
        apiUrl('/api/profiles/self/personal-info', this.baseUrl),
        request,
      ),
    );
  }
}
