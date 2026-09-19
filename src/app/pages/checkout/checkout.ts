import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  // Producto temporal
  producto = 'Laptop HP';
  precio = 2500;
  cantidad = 1;
  envio = 15;

  subtotal = this.precio * this.cantidad;
  total = this.subtotal + this.envio;

  constructor(private router: Router) {}

  confirmarCompra() {

    // Validar campos obligatorios
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

    // Validar correo
    if (!this.correo.includes('@')) {
      alert('Ingrese un correo electrónico válido');
      return;
    }

    // Crear pedido
    const pedido = {

      numeroPedido: 'MALV-' + Date.now(),

      fecha: new Date().toLocaleDateString('es-PE'),

      cliente: {
        nombres: this.nombres,
        apellidos: this.apellidos,
        correo: this.correo,
        telefono: this.telefono
      },

      entrega: {
        departamento: this.departamento,
        distrito: this.distrito,
        direccion: this.direccion,
        referencia: this.referencia
      },

      metodoPago: this.metodoPago,

      producto: this.producto,
      precio: this.precio,
      cantidad: this.cantidad,

      subtotal: this.subtotal,
      envio: this.envio,
      total: this.total
    };

    // Guardar el último pedido
    localStorage.setItem(
      'malvitec_last_order',
      JSON.stringify(pedido)
    );

    // Recuperar pedidos anteriores
    const pedidosGuardados = JSON.parse(
      localStorage.getItem('malvitec_orders') || '[]'
    );

    // Agregar el pedido nuevo
    pedidosGuardados.push(pedido);

    // Guardar nuevamente el historial
    localStorage.setItem(
      'malvitec_orders',
      JSON.stringify(pedidosGuardados)
    );

    // Ir a Confirmación
    this.router.navigate(['/confirmacion']);
  }
}