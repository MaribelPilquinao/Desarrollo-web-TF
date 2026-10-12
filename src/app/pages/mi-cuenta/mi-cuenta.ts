import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { mensajeDeError } from '../../core/api';
import { ConsultaCliente, ConsultaService } from '../../core/services/consulta.service';
import { Compra, PedidoService } from '../../core/services/pedido.service';
import { CambiosPerfil, Perfil, PerfilService } from '../../core/services/perfil.service';
import { SesionService } from '../../core/services/sesion.service';

const METODOS_PAGO: Record<string, string> = {
  tarjeta: 'Tarjeta',
  yape_plin: 'Yape / Plin',
  contra_entrega: 'Contra entrega'
};

const CONTRASENA_VALIDA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

@Component({
  selector: 'app-mi-cuenta',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta {
  private readonly perfilService = inject(PerfilService);
  private readonly pedidoService = inject(PedidoService);
  private readonly consultaService = inject(ConsultaService);

  // signals: cambian después de la respuesta HTTP y la app no usa zone.js.
  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');

  // Las compras y las consultas son del cliente; el proveedor ve las suyas en su panel.
  readonly esCliente = inject(SesionService).usuario()?.rol === 'cliente';
  readonly compras = signal<Compra[]>([]);
  readonly cargandoCompras = signal(this.esCliente);
  readonly errorCompras = signal('');
  readonly consultas = signal<ConsultaCliente[]>([]);
  readonly cargandoConsultas = signal(this.esCliente);
  readonly errorConsultas = signal('');

  // Edición de datos y cambio de contraseña.
  readonly editando = signal(false);
  readonly guardando = signal(false);
  readonly errorEdicion = signal('');
  readonly aviso = signal('');
  datos = { nombre: '', apellidos: '', telefono: '', preferencia_pago: '', departamento: '', distrito: '', direccion: '', referencia: '' };

  readonly cambiandoContrasena = signal(false);
  readonly errorContrasena = signal('');
  contrasena = { actual: '', nueva: '', confirmar: '' };

  constructor() {
    if (!inject(SesionService).conectado()) {
      void inject(Router).navigate(['/login']);
      return;
    }
    void this.cargar();
    if (this.esCliente) {
      void this.cargarCompras();
      void this.cargarConsultas();
    }
  }

  metodoPago(valor: string | null): string {
    return valor ? METODOS_PAGO[valor] ?? valor : 'Sin preferencia';
  }

  editar(): void {
    const p = this.perfil();
    if (!p) {
      return;
    }
    this.datos = {
      nombre: p.nombre,
      apellidos: p.apellidos ?? '',
      telefono: p.telefono ?? '',
      preferencia_pago: p.preferencia_pago ?? '',
      departamento: p.direccion?.departamento ?? '',
      distrito: p.direccion?.distrito ?? '',
      direccion: p.direccion?.direccion ?? '',
      referencia: p.direccion?.referencia ?? ''
    };
    this.errorEdicion.set('');
    this.aviso.set('');
    this.editando.set(true);
  }

  cancelar(): void {
    this.editando.set(false);
    this.errorEdicion.set('');
  }

  async guardar(): Promise<void> {
    if (this.guardando()) {
      return;
    }
    const d = this.datos;
    const cambios: CambiosPerfil = {
      nombre: d.nombre.trim(),
      apellidos: d.apellidos.trim(),
      telefono: d.telefono.trim(),
      preferencia_pago: d.preferencia_pago || null
    };

    // La dirección es opcional, pero si se llena tiene que ir completa.
    const direccion = [d.departamento, d.distrito, d.direccion].map(valor => valor.trim());
    if (direccion.some(Boolean) || d.referencia.trim()) {
      if (!direccion.every(Boolean)) {
        this.errorEdicion.set('Para guardar tu dirección indica el departamento, el distrito y la dirección.');
        return;
      }
      cambios.direccion = { departamento: direccion[0], distrito: direccion[1], direccion: direccion[2], referencia: d.referencia.trim() };
    }

    if (await this.enviar(cambios, this.errorEdicion)) {
      this.editando.set(false);
      this.aviso.set('Guardamos tus datos.');
    }
  }

  async cambiarContrasena(): Promise<void> {
    if (this.guardando()) {
      return;
    }
    const c = this.contrasena;
    if (!c.actual) {
      this.errorContrasena.set('Ingresa tu contraseña actual.');
      return;
    } 
    if (!CONTRASENA_VALIDA.test(c.nueva)) {
      this.errorContrasena.set('La contraseña nueva debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.');
      return;
    }
    if (c.nueva !== c.confirmar) {
      this.errorContrasena.set('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (await this.enviar({ contrasena_actual: c.actual, contrasena_nueva: c.nueva }, this.errorContrasena)) {
      this.contrasena = { actual: '', nueva: '', confirmar: '' };
      this.cambiandoContrasena.set(false);
      this.aviso.set('Cambiamos tu contraseña.');
    }
  }

  private async enviar(cambios: CambiosPerfil, error: { set(valor: string): void }): Promise<boolean> {
    this.guardando.set(true);
    error.set('');
    this.aviso.set('');
    try {
      this.perfil.set(await this.perfilService.actualizar(cambios));
      return true;
    } catch (fallo) {
      error.set(mensajeDeError(fallo));
      return false;
    } finally {
      this.guardando.set(false);
    }
  }

  private async cargar() {
    try {
      this.perfil.set(await this.perfilService.obtener());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarCompras() {
    try {
      this.compras.set(await this.pedidoService.listarMisCompras());
    } catch (error) {
      this.errorCompras.set(mensajeDeError(error));
    } finally {
      this.cargandoCompras.set(false);
    }
  }

  private async cargarConsultas() {
    try {
      this.consultas.set(await this.consultaService.listar());
    } catch (error) {
      this.errorConsultas.set(mensajeDeError(error));
    } finally {
      this.cargandoConsultas.set(false);
    }
  }
}
