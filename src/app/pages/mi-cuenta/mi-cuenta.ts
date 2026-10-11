import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';

import { mensajeDeError } from '../../core/api';
import { Compra, PedidoService } from '../../core/services/pedido.service';
import { Perfil, PerfilService } from '../../core/services/perfil.service';
import { SesionService } from '../../core/services/sesion.service';

const METODOS_PAGO: Record<string, string> = {
  tarjeta: 'Tarjeta',
  yape_plin: 'Yape / Plin',
  contra_entrega: 'Contra entrega'
};

@Component({
  selector: 'app-mi-cuenta',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta {
  private readonly perfilService = inject(PerfilService);
  private readonly pedidoService = inject(PedidoService);

  // signals: cambian después de la respuesta HTTP y la app no usa zone.js.
  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');

  // Las compras son del cliente; el proveedor ve sus pedidos en su panel.
  readonly esCliente = inject(SesionService).usuario()?.rol === 'cliente';
  readonly compras = signal<Compra[]>([]);
  readonly cargandoCompras = signal(this.esCliente);
  readonly errorCompras = signal('');

  constructor() {
    if (!inject(SesionService).conectado()) {
      void inject(Router).navigate(['/login']);
      return;
    }
    void this.cargar();
    if (this.esCliente) {
      void this.cargarCompras();
    }
  }

  metodoPago(valor: string | null): string {
    return valor ? METODOS_PAGO[valor] ?? valor : 'Sin preferencia';
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
}
