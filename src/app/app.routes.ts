import { Routes } from '@angular/router';
import { Checkout } from './pages/checkout/checkout';
import { Confirmacion } from './pages/confirmacion/confirmacion';
import { MiCuenta } from './pages/mi-cuenta/mi-cuenta';

export const routes: Routes = [
  {
    path: 'checkout',
    component: Checkout
  },
  {
    path: 'confirmacion',
    component: Confirmacion
  },
  {
    path: 'mi-cuenta',
    component: MiCuenta
  },
  {
    path: '',
    redirectTo: 'checkout',
    pathMatch: 'full'
  }
];