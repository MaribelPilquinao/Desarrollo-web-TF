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

// Solo se envía lo que cambia. La contraseña nueva exige la actual.
export interface CambiosPerfil {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  preferencia_pago?: string | null;
  direccion?: { departamento: string; distrito: string; direccion: string; referencia: string };
  contrasena_actual?: string;
  contrasena_nueva?: string;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);

  obtener(): Promise<Perfil> {
    return firstValueFrom(this.http.get<Perfil>(`${API_URL}/perfil`));
  }

  // Devuelve el perfil ya actualizado.
  actualizar(cambios: CambiosPerfil): Promise<Perfil> {
    return firstValueFrom(this.http.put<Perfil>(`${API_URL}/perfil`, cambios));
  }
}
