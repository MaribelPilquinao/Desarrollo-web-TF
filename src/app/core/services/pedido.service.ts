import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../api';

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

  crear(datos: NuevoPedido): Promise<PedidoCreado> {
    return firstValueFrom(this.http.post<PedidoCreado>(`${API_URL}/pedidos`, datos));
  }
}