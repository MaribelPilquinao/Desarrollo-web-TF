import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { CarritoService } from './core/services/carrito.service';
import { FavoritosService } from './core/services/favoritos.service';
import { SesionService } from './core/services/sesion.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly menuOpen = signal(false);
  readonly sesion = inject(SesionService);
  readonly favoritos = inject(FavoritosService);
  readonly carrito = inject(CarritoService);
  private readonly router = inject(Router);
  logout(): void { this.menuOpen.set(false); this.sesion.cerrarSesion(); void this.router.navigate(['/login']); }
  cerrarAviso(): void { this.carrito.error.set(''); this.favoritos.error.set(''); }

  protected readonly title = signal('desarrollo-web-TF');
}
