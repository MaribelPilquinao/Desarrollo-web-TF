
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../api';
import { Consulta } from '../models/consulta.model';
import { EstadoPedido, Pedido } from '../models/pedido.model';
import { Categoria, DatosProducto, Producto } from '../models/producto.model';
import { ResumenProveedor } from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/proveedor`;

  resumen(): Promise<ResumenProveedor> {
    return firstValueFrom(this.http.get<ResumenProveedor>(`${this.base}/resumen`));
  }

  categorias(): Promise<Categoria[]> {
    return firstValueFrom(this.http.get<Categoria[]>(`${this.base}/categorias`));
  }

  productos(): Promise<Producto[]> {
    return firstValueFrom(this.http.get<Producto[]>(`${this.base}/productos`));
  }

  producto(slug: string): Promise<Producto> {
    return firstValueFrom(this.http.get<Producto>(`${this.base}/productos/${encodeURIComponent(slug)}`));
  }

  crearProducto(datos: DatosProducto): Promise<Producto> {
    return firstValueFrom(this.http.post<Producto>(`${this.base}/productos`, datos));
  }

  editarProducto(slug: string, cambios: Partial<DatosProducto> & { activo?: boolean }): Promise<Producto> {
    return firstValueFrom(
      this.http.put<Producto>(`${this.base}/productos/${encodeURIComponent(slug)}`, cambios)
    );
  }

  pedidos(): Promise<Pedido[]> {
    return firstValueFrom(this.http.get<Pedido[]>(`${this.base}/pedidos`));
  }

  cambiarEstadoPedido(id: number, estado: EstadoPedido): Promise<Pedido> {
    return firstValueFrom(this.http.put<Pedido>(`${this.base}/pedidos/${id}`, { estado }));
  }

  consultas(): Promise<Consulta[]> {
    return firstValueFrom(this.http.get<Consulta[]>(`${this.base}/consultas`));
  }

  responderConsulta(id: number, respuesta: string): Promise<{ id: number; respuesta: string; estado: 'Respondida' }> {
    return firstValueFrom(this.http.put<{ id: number; respuesta: string; estado: 'Respondida' }>(
      `${this.base}/consultas/${id}`,
      { respuesta }
    ));
  }
}