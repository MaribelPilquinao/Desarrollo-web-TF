import { Routes } from '@angular/router';

export const PROVEEDOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./proveedor-layout/proveedor-layout').then(m => m.ProveedorLayout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () =>
          import('./proveedor-dashboard/proveedor-dashboard').then(m => m.ProveedorDashboard) },
      { path: 'productos', loadComponent: () =>
          import('./proveedor-productos/proveedor-productos').then(m => m.ProveedorProductos) },
      { path: 'agregar-producto', loadComponent: () =>
          import('./proveedor-agregar-producto/proveedor-agregar-producto').then(m => m.ProveedorAgregarProducto) },
      { path: 'consultas', loadComponent: () =>
          import('./proveedor-consultas/proveedor-consultas').then(m => m.ProveedorConsultas) },
      { path: 'pedidos', loadComponent: () =>
          import('./proveedor-pedidos/proveedor-pedidos').then(m => m.ProveedorPedidos) }
    ]
  }
];