import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SesionService } from '../../../core/services/sesion.service';

@Component({
  selector: 'app-proveedor-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './proveedor-layout.html',
  styleUrl: './proveedor-layout.css'
})
export class ProveedorLayout {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  readonly usuario = this.sesion.usuario;

  cerrarSesion(): void {
    this.sesion.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}