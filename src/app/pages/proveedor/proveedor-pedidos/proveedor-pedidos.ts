import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { mensajeDeError } from '../../../core/api';
import { EstadoPedido, Pedido } from '../../../core/models/pedido.model';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { METODOS_PAGO, claseEstado } from '../proveedor-ui';

type Filtro = 'Todos' | EstadoPedido;
 
 @Component({
   selector: 'app-proveedor-pedidos',
  imports: [DatePipe, DecimalPipe],
   templateUrl: './proveedor-pedidos.html',
   styleUrl: './proveedor-pedidos.css'
 })

export class ProveedorPedidos implements OnInit {
  private readonly api = inject(ProveedorService);

  readonly filtros: Filtro[] = ['Todos', 'Pendiente', 'En camino', 'Entregado', 'Cancelado'];
  readonly pedidos = signal<Pedido[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly ocupado = signal<number | null>(null);
  readonly filtro = signal<Filtro>('Todos');
  readonly claseEstado = claseEstado;
  readonly metodos = METODOS_PAGO;

  readonly visibles = computed(() =>
    this.pedidos().filter(p => this.coincide(p, this.filtro()))
  );

  ngOnInit(): void {
    void this.cargar();
  }

  cantidad(filtro: Filtro): number {
    return this.pedidos().filter(p => this.coincide(p, filtro)).length;
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.pedidos.set(await this.api.pedidos());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiarEstado(pedido: Pedido, estado: EstadoPedido): Promise<void> {
    if (this.ocupado()) {
      return;
    }
    if (estado === 'Cancelado' && !confirm(`¿Cancelar el pedido ${pedido.codi} (${pedido.producto})? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.ocupado.set(pedido.id);
    this.error.set('');
    try {
      const actualizado = await this.api.cambiarEstadoPedido(pedido.id, estado);
      this.pedidos.update(lista => lista.map(p => (p.id === actualizado.id ? actualizado : p)));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.ocupado.set(null);
    }
  }

  // Completado (pedidos antiguos) se agrupa con Entregado.
  private coincide(pedido: Pedido, filtro: Filtro): boolean {
    if (filtro === 'Todos') {
      return true;
    }
    return filtro === 'Entregado' ? pedido.estado === 'Entregado' || pedido.estado === 'Completado' : pedido.estado === filtro;
  }
}