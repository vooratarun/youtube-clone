import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type UserSettings = {
  userId: number;
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoplay: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  createdAt?: string;
  updatedAt?: string;
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/users';

  getSettings(userId: number): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${this.baseUrl}/${userId}/settings`);
  }

  updateSettings(userId: number, settings: Partial<UserSettings>): Observable<UserSettings> {
    return this.http.put<UserSettings>(`${this.baseUrl}/${userId}/settings`, settings);
  }
}

