import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../api';

// Lado del cliente. Las consultas que recibe el proveedor están en ProveedorService.
@Injectable({ providedIn: 'root' })
export class ConsultaService {
  private readonly http = inject(HttpClient);

  preguntar(slug: string, mensaje: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API_URL}/consultas`, { slug, mensaje }));
  }
}
