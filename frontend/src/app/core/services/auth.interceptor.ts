import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthSessionService } from './auth-session.service';

const publicAuthUrls = ['/api/auth/login', '/api/auth/register'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authSession = inject(AuthSessionService);
  const token = authSession.token();
  const isPublicAuthUrl = publicAuthUrls.some((url) => request.url.startsWith(url));
  const shouldAttachToken = request.url.startsWith('/api/') && token !== null && !isPublicAuthUrl;
  const authRequest = shouldAttachToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse
        && error.status === 401
        && !isPublicAuthUrl
      ) {
        authSession.expireSession();
      }

      return throwError(() => error);
    }),
  );
};
