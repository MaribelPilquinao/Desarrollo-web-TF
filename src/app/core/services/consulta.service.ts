import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../api';

// Consulta como la ve el cliente que la hizo, con la respuesta del proveedor cuando ya existe.
export interface ConsultaCliente {
  id: number;
  slug: string;
  producto: string;
  proveedor: string;
  mensaje: string;
  respuesta: string | null;
  estado: 'Nueva' | 'Respondida';
  creado_en: string;
  respondida_en: string | null;
}

// Lado del cliente. Las consultas que recibe el proveedor están en ProveedorService.
@Injectable({ providedIn: 'root' })
export class ConsultaService {
  private readonly http = inject(HttpClient);

  listar(): Promise<ConsultaCliente[]> {
    return firstValueFrom(this.http.get<ConsultaCliente[]>(`${API_URL}/consultas`));
  }

  preguntar(slug: string, mensaje: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API_URL}/consultas`, { slug, mensaje }));
  }
}
