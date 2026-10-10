import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../api';
import { Pedido } from '../models/pedido.model';

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

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);

  private pedidos: Pedido[] = [
    { id: '#4512', cliente: 'José Ramírez', producto: 'Teclado Mecánico RGB', total: 229, estado: 'Pendiente' },
    { id: '#4513', cliente: 'Camila López', producto: 'Audífonos Sony WH-XB910', total: 589, estado: 'Completado' },
    { id: '#4514', cliente: 'Luis Torres', producto: 'Mouse Gamer Logitech G502', total: 189, estado: 'Pendiente' }
  ];

  crear(datos: NuevoPedido): Promise<PedidoCreado> {
    return firstValueFrom(this.http.post<PedidoCreado>(`${API_URL}/pedidos`, datos));
  }

  listarUltimos(): Pedido[] {
    return this.pedidos;
  }

  listarPendientes(): Pedido[] {
    return this.pedidos.filter(p => p.estado === 'Pendiente');
  }
}