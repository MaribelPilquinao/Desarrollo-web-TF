import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../api';

const SESION_KEY = 'malvitec_sesion';

export interface Usuario {
  id: number;
  nombre: string;
  apellidos: string | null;
  correo: string;
  rol: 'cliente' | 'proveedor';
}

interface Sesion {
  token: string;
  usuario: Usuario;
}

export interface DatosRegistro {
  nombre: string;
  correo: string;
  telefono: string;
  contrasena: string;
  codigo: string;
  preferencia_pago: string;
}

@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly http = inject(HttpClient);
  private readonly sesion = signal<Sesion | null>(this.leer());

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly conectado = computed(() => this.sesion() !== null);

  token(): string | null {
    return this.sesion()?.token ?? null;
  }

  async iniciarSesion(correo: string, contrasena: string): Promise<void> {
    const sesion = await firstValueFrom(
      this.http.post<Sesion>(`${API_URL}/auth/login`, { correo, contrasena })
    );
    this.guardar(sesion);
  }

  async registrar(datos: DatosRegistro): Promise<void> {
    await firstValueFrom(this.http.post(`${API_URL}/auth/registro`, datos));
  }

  async recuperar(correo: string, codigo: string, nuevaContrasena: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_URL}/auth/recuperar`, {
        correo,
        codigo,
        nueva_contrasena: nuevaContrasena
      })
    );
  }

  cerrarSesion(): void {
    this.guardar(null);
  }

  private leer(): Sesion | null {
    try {
      const sesion = JSON.parse(localStorage.getItem(SESION_KEY) || 'null');
      if (sesion?.token && sesion.usuario && !this.vencido(sesion.token)) {
        return sesion;
      }
    } catch {
      /* localStorage bloqueado: la sesión queda solo en memoria. */
    }
    return null;
  }

  private guardar(sesion: Sesion | null): void {
    this.sesion.set(sesion);
    try {
      if (sesion) {
        localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
      } else {
        localStorage.removeItem(SESION_KEY);
      }
    } catch {
      /* localStorage bloqueado: la sesión queda solo en memoria. */
    }
  }

  // El token dura 8 horas; se descarta al recargar si ya venció.
  private vencido(token: string): boolean {
    try {
      const datos = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof datos.exp !== 'number' || datos.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}
