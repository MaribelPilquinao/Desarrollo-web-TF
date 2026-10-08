import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';
import { Favorito, FavoritosService } from '../../core/services/favoritos.service';
import { SesionService } from '../../core/services/sesion.service';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class Favorites {
  private readonly favoritosService = inject(FavoritosService);
  private readonly carritoService = inject(CarritoService);
  readonly sesion = inject(SesionService);

  readonly favoritos = this.favoritosService.favoritos;

  readonly productoAgregadoId = signal<string | null>(null);

  quitar(id: string): void {
    this.favoritosService.quitar(id);
  }

  async agregarAlCarrito(favorito: Favorito): Promise<void> {
    if (!(await this.carritoService.agregar(favorito))) {
      return;
    }

    this.productoAgregadoId.set(favorito.id);

    setTimeout(() => {
      this.productoAgregadoId.set(null);
    }, 900);
  }
}
