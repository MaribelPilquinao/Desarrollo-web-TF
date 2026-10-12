import { Component, inject, signal, computed } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs'


import { CarritoService } from './core/services/carrito.service';
import { FavoritosService } from './core/services/favoritos.service';
import { SesionService } from './core/services/sesion.service';
import { BusquedaService } from './core/services/busqueda.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
  // El menú de la cuenta se cierra al hacer clic fuera o con Escape.
  host: {
    '(document:click)': 'menuCuenta.set(false)',
    '(document:keydown.escape)': 'menuCuenta.set(false)'
  }
})
export class App {
  readonly menuOpen = signal(false);
  readonly menuCuenta = signal(false);
  readonly sesion = inject(SesionService);
  readonly favoritos = inject(FavoritosService);
  readonly carrito = inject(CarritoService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map(evento => evento.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );
  readonly esProveedor = computed(() => this.url().startsWith('/proveedor'))

  // En la barra solo va el primer nombre, para que no empuje al resto.
  readonly nombreCorto = computed(() => (this.sesion.usuario()?.nombre ?? '').trim().split(/\s+/)[0]);
  readonly inicial = computed(() => this.nombreCorto().charAt(0).toUpperCase());

  logout(): void { this.menuOpen.set(false); this.menuCuenta.set(false); this.sesion.cerrarSesion(); void this.router.navigate(['/login']); }
  cerrarAviso(): void { this.carrito.error.set(''); this.favoritos.error.set(''); }
  private readonly busquedaService = inject(BusquedaService);

  terminoBusqueda = this.busquedaService.termino;

  cambiarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busquedaService.actualizarTermino(input.value);
  }

  buscarProductos(event: Event): void {
    // Sin esto, Enter envía el formulario y el navegador recarga la página antes de buscar.
    event.preventDefault();
    this.menuOpen.set(false);
    this.busquedaService.buscar();
    // Los resultados se muestran en el inicio; desde otra página hay que ir ahí.
    void this.router.navigate(['/home']);
  }

  protected readonly title = signal('desarrollo-web-TF');
}
