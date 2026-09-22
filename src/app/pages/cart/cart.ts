import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  readonly carrito = inject(CarritoService);

  aumentar(id: string, cantidad: number): void {
    this.carrito.cambiarCantidad(id, cantidad + 1);
  }

  disminuir(id: string, cantidad: number): void {
    if (cantidad > 1) {
      this.carrito.cambiarCantidad(id, cantidad - 1);
    }
  }

  quitar(id: string): void {
    this.carrito.quitar(id);
  }
}
