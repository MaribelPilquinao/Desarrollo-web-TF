import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout {

  // Datos personales
  nombres = '';
  apellidos = '';
  correo = '';
  telefono = '';

  // Dirección
  departamento = '';
  distrito = '';
  direccion = '';
  referencia = '';

  // Método de pago
  metodoPago = '';

  // Datos temporales del producto
  producto = 'Laptop HP';
  precio = 2500;
  cantidad = 1;
  envio = 15;

  subtotal = this.precio * this.cantidad;
  total = this.subtotal + this.envio;

  confirmarCompra() {

  if (
    this.nombres === '' ||
    this.apellidos === '' ||
    this.correo === '' ||
    this.telefono === '' ||
    this.departamento === '' ||
    this.distrito === '' ||
    this.direccion === '' ||
    this.metodoPago === ''
  ) {
    alert('Por favor complete todos los campos obligatorios');
    return;
  }

  alert('Datos correctos. Compra lista para confirmar');
}
}