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
    console.log('Nombres:', this.nombres);
    console.log('Apellidos:', this.apellidos);
    console.log('Correo:', this.correo);
    console.log('Teléfono:', this.telefono);
    console.log('Departamento:', this.departamento);
    console.log('Distrito:', this.distrito);
    console.log('Dirección:', this.direccion);
    console.log('Método de pago:', this.metodoPago);

    alert('Datos registrados correctamente');
  }
}