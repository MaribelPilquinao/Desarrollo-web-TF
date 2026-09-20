import { Routes } from "@angular/router";

export const routes: Routes = [
    {
  path: 'proveedor',
  loadChildren: () =>
    import('./pages/proveedor/proveedor.routes').then(m => m.PROVEEDOR_ROUTES)
}
];
