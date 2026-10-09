import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { SesionService } from './services/sesion.service';

export const soloProveedor: CanMatchFn = () => {
  const sesion = inject(SesionService);
  const router = inject(Router);

  if (!sesion.conectado()) {
    return router.createUrlTree(['/login']);
  }
  return sesion.usuario()?.rol === 'proveedor' ? true : router.createUrlTree(['/home']);
};