import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../api';

export interface Direccion {
  departamento: string;
  distrito: string;
  direccion: string;
  referencia: string | null;
}

export interface Perfil {
  nombre: string;
  apellidos: string | null;
  correo: string;
  telefono: string | null;
  rol: 'cliente' | 'proveedor';
  preferencia_pago: 'tarjeta' | 'yape_plin' | 'contra_entrega' | null;
  creado_en: string;
  direccion: Direccion | null;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);

  obtener(): Promise<Perfil> {
    return firstValueFrom(this.http.get<Perfil>(`${API_URL}/perfil`));
  }
}
