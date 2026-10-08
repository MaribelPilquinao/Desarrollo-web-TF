import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_URL } from './api';
import { SesionService } from './services/sesion.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  const token = sesion.token();

  if (!token || !req.url.startsWith(API_URL)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      // 401 con token enviado: venció o no es válido.
      if (error instanceof HttpErrorResponse && error.status === 401) {
        sesion.cerrarSesion();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
