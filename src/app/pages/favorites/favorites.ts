import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';
import { Favorito, FavoritosService } from '../../core/services/favoritos.service';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class Favorites {
  private readonly favoritosService = inject(FavoritosService);
  private readonly carritoService = inject(CarritoService);

  readonly favoritos = this.favoritosService.favoritos;

  productoAgregadoId: string | null = null;

  quitar(id: string): void {
    this.favoritosService.quitar(id);
  }

  agregarAlCarrito(favorito: Favorito): void {
    this.carritoService.agregar(favorito);

    this.productoAgregadoId = favorito.id;

    setTimeout(() => {
      this.productoAgregadoId = null;
    }, 900);
  }
}
