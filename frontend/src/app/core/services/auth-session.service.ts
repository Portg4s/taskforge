import { Injectable, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly tokenStorageKey = 'taskforge.authToken';
  private readonly selectedProjectStorageKey = 'taskforge.selectedProjectId';
  private readonly selectedBoardStorageKey = 'taskforge.selectedBoardId';

  readonly currentUser = signal<AuthUser | null>(null);

  constructor(private readonly authApi: AuthApiService) {
  }

  token(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  restoreSession(): Observable<AuthUser | null> {
    if (this.token() === null) {
      return of(null);
    }

    return this.authApi.me().pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  login(request: LoginRequest): Observable<AuthUser> {
    return this.authApi.login(request).pipe(
      tap((response) => this.storeAuth(response)),
      map((response) => response.user),
    );
  }

  register(request: RegisterRequest): Observable<AuthUser> {
    return this.authApi.register(request).pipe(
      tap((response) => this.storeAuth(response)),
      map((response) => response.user),
    );
  }

  logout(): void {
    this.clearSession();
  }

  expireSession(): void {
    this.clearSession();
  }

  private storeAuth(response: AuthResponse): void {
    localStorage.setItem(this.tokenStorageKey, response.token);
    this.currentUser.set(response.user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.selectedProjectStorageKey);
    localStorage.removeItem(this.selectedBoardStorageKey);
    this.currentUser.set(null);
  }
}
