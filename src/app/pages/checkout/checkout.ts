import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { mensajeDeError } from '../../core/api';
import { CarritoService } from '../../core/services/carrito.service';
import { PedidoService } from '../../core/services/pedido.service';
import { PerfilService } from '../../core/services/perfil.service';
import { SesionService } from '../../core/services/sesion.service';

// Los departamentos que ofrece el formulario.
const DEPARTAMENTOS = ['Lima', 'Arequipa', 'La Libertad', 'Piura'];

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

  // signal: cambia después de un await y la app no usa zone.js.
  readonly enviando = signal(false);

  // Una clave por compra: si el pedido se reenvía, el backend no lo duplica.
  private readonly clave = crypto.randomUUID();

  constructor(
    public carrito: CarritoService,
    private router: Router,
    private pedidoService: PedidoService,
    private perfilService: PerfilService,
    sesion: SesionService
  ) {
    if (sesion.conectado()) {
      void this.rellenar();
    }
  }

  // signal: se actualiza después de un await y hace que la pantalla muestre los datos cargados.
  readonly datosCargados = signal(false);

  // Llena el formulario con los datos de la cuenta, sin pisar lo que el usuario ya escribió.
  private async rellenar() {
    try {
      const perfil = await this.perfilService.obtener();
      this.nombres ||= perfil.nombre;
      this.apellidos ||= perfil.apellidos ?? '';
      this.correo ||= perfil.correo;
      this.telefono ||= perfil.telefono ?? '';
      this.metodoPago ||= perfil.preferencia_pago ?? '';
      if (perfil.direccion && !this.direccion) {
        this.departamento ||= DEPARTAMENTOS.includes(perfil.direccion.departamento) ? perfil.direccion.departamento : '';
        this.distrito ||= perfil.direccion.distrito;
        this.direccion = perfil.direccion.direccion;
        this.referencia ||= perfil.direccion.referencia ?? '';
      }
      this.datosCargados.set(true);
    } catch {
      // Si el perfil no carga, el formulario queda vacío y se llena a mano.
    }
  }

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

    this.enviando.set(true);
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
      this.enviando.set(false);
    }
  }
}
