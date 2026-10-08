import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { API_URL, mensajeDeError } from '../api';
import { SesionService } from './sesion.service';

export interface Favorito {
  id: string;
  title: string;
  price: number;
  img: string;
}

interface FavoritoApi {
  slug: string;
  titulo: string;
  precio_actual: number;
  imagen_url: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly lista = signal<Favorito[]>([]);

  readonly favoritos = this.lista.asReadonly();
  readonly cantidad = computed(() => this.lista().length);
  readonly error = signal('');

  constructor() {
    effect(() => {
      if (this.sesion.conectado()) {
        void this.cargar();
      } else {
        this.lista.set([]);
      }
    });
  }

  esFavorito(id: string): boolean {
    return this.lista().some(favorito => favorito.id === id);
  }

  async alternar(favorito: Favorito): Promise<void> {
    if (this.esFavorito(favorito.id)) {
      await this.quitar(favorito.id);
      return;
    }
    if (!this.exigirSesion()) {
      return;
    }

    // Se muestra al instante y se corrige si el backend lo rechaza.
    this.lista.update(lista => [favorito, ...lista]);
    try {
      await firstValueFrom(this.http.post(`${API_URL}/favoritos`, { slug: favorito.id }));
    } catch (error) {
      this.fallo(error);
    }
  }

  async quitar(id: string): Promise<void> {
    if (!this.exigirSesion()) {
      return;
    }

    this.lista.update(lista => lista.filter(favorito => favorito.id !== id));
    try {
      await firstValueFrom(this.http.delete(`${API_URL}/favoritos/${encodeURIComponent(id)}`));
    } catch (error) {
      this.fallo(error);
    }
  }

  private async cargar(): Promise<void> {
    try {
      const datos = await firstValueFrom(this.http.get<FavoritoApi[]>(`${API_URL}/favoritos`));
      this.lista.set(
        datos.map(producto => ({
          id: producto.slug,
          title: producto.titulo,
          price: producto.precio_actual,
          img: producto.imagen_url
        }))
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  private fallo(error: unknown): void {
    this.error.set(mensajeDeError(error));
    if (this.sesion.conectado()) {
      void this.cargar();
    }
  }

  private exigirSesion(): boolean {
    if (!this.sesion.conectado()) {
      void this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}
