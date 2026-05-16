import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

type DummyUser = {
  id?: number;
  username: string;
  role?: RegisterRole;
};

type RegisterRole = 'user' | 'admin';

const AUTH_STORAGE_KEY = 'youtube-clone-auth-user';
const AUTH_TOKEN_STORAGE_KEY = 'youtube-clone-auth-token';

type LoginApiResponse = {
  username?: string;
  token?: string;
  role?: RegisterRole;
  message?: string;
  user?: {
    id?: number;
    "username": string,
    "name": string,
    "role"?: RegisterRole
  };
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly loginApiUrl = 'http://localhost:3000/login';
  private readonly registerApiUrl = 'http://localhost:3000/register';
  private readonly currentUserSignal = signal<DummyUser | null>(this.readStoredUser());

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  // login(username: string): void {
  //   const user = this.toStoredUser(username);
  //   this.persistUser(user);
  // }

  loginWithApi(username: string, password: string): Observable<void> {
    return this.http.post<LoginApiResponse>(this.loginApiUrl, { username, password }).pipe(
      tap((response) => {
        const resolvedUsername = response.user?.username ?? response.username ?? username;
        const resolvedId = response.user?.id;
        const resolvedRole = response.user?.role ?? response.role;
        const user = this.toStoredUser(resolvedUsername, resolvedId, resolvedRole);

        if (response.token) {
          localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.token);
        }

        this.persistUser(user);
      }),
      map(() => void 0)
    );
  }

  registerWithApi(username: string, password: string, name: string, role: RegisterRole): Observable<void> {
    return this.http.post<LoginApiResponse>(this.registerApiUrl, { username, password, name, role }).pipe(
      tap((response) => {
        const resolvedUsername = response.user?.username ?? response.username ?? username;
        const resolvedId = response.user?.id;
        const resolvedRole = response.user?.role ?? response.role ?? role;
        const user = this.toStoredUser(resolvedUsername, resolvedId, resolvedRole);

        if (response.token) {
          localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.token);
        }

        this.persistUser(user);
      }),
      map(() => void 0)
    );
  }

  logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    this.currentUserSignal.set(null);
  }

  getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<void>('http://localhost:3000/change-password', { oldPassword, newPassword })
      .pipe(map(() => void 0));
  }

  private persistUser(user: DummyUser): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private toStoredUser(username: string, id?: number, role?: RegisterRole): DummyUser {
    const trimmedUsername = username.trim() || 'Guest User';
    return { id, username: trimmedUsername, role };
  }

  private readStoredUser(): DummyUser | null {
    const rawUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as DummyUser;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }
}
