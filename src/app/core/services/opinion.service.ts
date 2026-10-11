import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../api';

export interface Opinion {
  id: number;
  autor: string;
  calificacion: number;
  comentario: string | null;
  creado_en: string;
}

// Promedio y cantidad del producto, ya recalculados después de opinar.
export interface ResumenOpiniones {
  calificacion_prom: number;
  num_opiniones: number;
}

@Injectable({ providedIn: 'root' })
export class OpinionService {
  private readonly http = inject(HttpClient);

  listar(slug: string): Promise<Opinion[]> {
    return firstValueFrom(this.http.get<Opinion[]>(`${API_URL}/opiniones/${encodeURIComponent(slug)}`));
  }

  opinar(slug: string, calificacion: number, comentario: string): Promise<ResumenOpiniones> {
    return firstValueFrom(
      this.http.post<ResumenOpiniones>(`${API_URL}/opiniones/${encodeURIComponent(slug)}`, { calificacion, comentario })
    );
  }
}
