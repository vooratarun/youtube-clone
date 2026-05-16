import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

const AUTH_REQUIRED_URL_PATTERN = /\/users\/\d+\/liked-videos|\/delete-video\/\d+|\/videos\/\d+\/comments|\/comments\/\d+|\/change-password|\/users\/\d+\/playlists|\/users\/\d+\/watch-history(?:\/\d+)?|\/users\/\d+\/settings|\/users\/\d+\/subscribed-channels(?:\/|$)/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAuthToken();

  // Attach Bearer token for endpoints that require authenticated actions.
  if (token && AUTH_REQUIRED_URL_PATTERN.test(req.url)) {
    const clonedRequest = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  return next(req);
};
