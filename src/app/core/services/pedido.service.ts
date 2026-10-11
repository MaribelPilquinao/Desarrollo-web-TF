import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../api';
import { EstadoPedido } from '../models/pedido.model';

export interface NuevoPedido {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  departamento: string;
  distrito: string;
  direccion: string;
  referencia: string;
  metodo_pago: string;
  // Identifica la compra: si se envía dos veces, el backend devuelve el mismo pedido.
  clave: string;
}

export interface PedidoCreado {
  id: number;
  codi: string;
  subtotal: number;
  costo_envio: number;
  total: number;
}

// Pedido como lo ve el cliente en Mi Cuenta. El estado va por ítem, porque cada proveedor atiende los suyos.
export interface Compra {
  id: number;
  codi: string;
  subtotal: number;
  costo_envio: number;
  total: number;
  metodo_pago: string;
  fecha: string;
  items: { id: number; titulo: string; precio: number; cantidad: number; estado: EstadoPedido }[];
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);

  crear(datos: NuevoPedido): Promise<PedidoCreado> {
    return firstValueFrom(this.http.post<PedidoCreado>(`${API_URL}/pedidos`, datos));
  }

  listarMisCompras(): Promise<Compra[]> {
    return firstValueFrom(this.http.get<Compra[]>(`${API_URL}/pedidos`));
  }
}
