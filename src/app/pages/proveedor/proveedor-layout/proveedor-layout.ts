import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SesionService } from '../../../core/services/sesion.service';

@Component({
  selector: 'app-proveedor-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './proveedor-layout.html',
  styleUrl: './proveedor-layout.css',
  // El menú de la cuenta se cierra al hacer clic fuera o con Escape.
  host: {
    '(document:click)': 'menuCuenta.set(false)',
    '(document:keydown.escape)': 'menuCuenta.set(false)'
  }
})
export class ProveedorLayout {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  readonly usuario = this.sesion.usuario;
  readonly menuOpen = signal(false);
  readonly menuCuenta = signal(false);
  readonly inicial = computed(() => (this.usuario()?.nombre ?? '').trim().charAt(0).toUpperCase());

  cerrarSesion(): void {
    this.menuOpen.set(false);
    this.menuCuenta.set(false);
    this.sesion.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
