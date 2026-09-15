import { Routes } from '@angular/router';
import { Checkout } from './pages/checkout/checkout';
import { Confirmacion } from './pages/confirmacion/confirmacion';

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
    path: '',
    redirectTo: 'checkout',
    pathMatch: 'full'
  }
];