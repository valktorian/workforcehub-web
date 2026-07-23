import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, apiUrl } from '../../../core/api/api.config';
import { ApiResponse, SelfProfileResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class ProfilePageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getSelf(): Promise<SelfProfileResponse> {
    return firstValueFrom(
      this.http.get<ApiResponse<SelfProfileResponse>>(
        apiUrl('/api/profiles/self', this.baseUrl),
      ),
    ).then((response) => response.data);
  }

  uploadPicture(file: File): Promise<SelfProfileResponse> {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(
      this.http.post<SelfProfileResponse>(
        apiUrl('/api/profiles/self/picture', this.baseUrl),
        form,
      ),
    );
  }
}
