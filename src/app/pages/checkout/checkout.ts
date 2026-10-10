import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { mensajeDeError } from '../../core/api';
import { CarritoService } from '../../core/services/carrito.service';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, DecimalPipe],
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

  enviando = false;

  // Una clave por compra: si el pedido se reenvía, el backend no lo duplica.
  private readonly clave = crypto.randomUUID();

  constructor(
    public carrito: CarritoService,
    private router: Router,
    private pedidoService: PedidoService
  ) {}

  async confirmarCompra() {

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

    if (this.carrito.items().length === 0) {
      alert('Tu carrito está vacío');
      return;
    }

    this.enviando = true;
    try {
      const pedido = await this.pedidoService.crear({
        nombres: this.nombres,
        apellidos: this.apellidos,
        correo: this.correo,
        telefono: this.telefono,
        departamento: this.departamento,
        distrito: this.distrito,
        direccion: this.direccion,
        referencia: this.referencia,
        metodo_pago: this.metodoPago,
        clave: this.clave
      });

      // El backend ya vació el carrito; esto actualiza el contador del header.
      await this.carrito.vaciar();

      // Ir a Confirmación
      this.router.navigate(['/confirmacion'], { queryParams: { codigo: pedido.codi } });
    } catch (error) {
      alert(mensajeDeError(error));
    } finally {
      this.enviando = false;
    }
  }
}
