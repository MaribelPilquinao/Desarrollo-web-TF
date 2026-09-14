import { Component } from '@angular/core';

@Component({
  selector: 'app-checkout',
  imports: [],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  producto = 'Laptop HP';
  precio = 2500;
  cantidad = 2;
  envio=15;

  subtotal = this.precio * this.cantidad;
  total = this.subtotal + this.envio;

  confirmarCompra() {
    alert('Compra confirmada :)');
  }
}
