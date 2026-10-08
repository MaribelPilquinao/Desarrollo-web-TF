import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { API_URL, mensajeDeError } from '../api';
import { SesionService } from './sesion.service';

export interface ItemCarrito {
  id: string;
  title: string;
  price: number;
  img: string;
  qty: number;
}

interface CarritoApi {
  items: {
    slug: string;
    titulo: string;
    imagen_url: string;
    precio_actual: number;
    cantidad: number;
    stock: number;
  }[];
  subtotal: number;
  costo_envio: number;
  total: number;
}

const VACIO: CarritoApi = { items: [], subtotal: 0, costo_envio: 0, total: 0 };

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly carrito = signal<CarritoApi>(VACIO);

  readonly items = computed<ItemCarrito[]>(() =>
    this.carrito().items.map(item => ({
      id: item.slug,
      title: item.titulo,
      price: item.precio_actual,
      img: item.imagen_url,
      qty: item.cantidad
    }))
  );

  readonly cantidadTotal = computed(() =>
    this.carrito().items.reduce((total, item) => total + item.cantidad, 0)
  );

  // Los montos y el costo de envío los calcula el backend.
  readonly subtotal = computed(() => this.carrito().subtotal);
  readonly envio = computed(() => this.carrito().costo_envio);
  readonly total = computed(() => this.carrito().total);

  readonly error = signal('');

  constructor() {
    effect(() => {
      if (this.sesion.conectado()) {
        void this.enviar(this.http.get<CarritoApi>(`${API_URL}/carrito`));
      } else {
        this.carrito.set(VACIO);
      }
    });
  }

  agregar(producto: Omit<ItemCarrito, 'qty'>, cantidad = 1): Promise<boolean> {
    return this.enviar(
      this.http.post<CarritoApi>(`${API_URL}/carrito`, { slug: producto.id, cantidad })
    );
  }

  cambiarCantidad(id: string, cantidad: number): Promise<boolean> {
    if (cantidad < 1) {
      return this.quitar(id);
    }
    return this.enviar(
      this.http.put<CarritoApi>(`${API_URL}/carrito/${encodeURIComponent(id)}`, { cantidad })
    );
  }

  quitar(id: string): Promise<boolean> {
    return this.enviar(
      this.http.delete<CarritoApi>(`${API_URL}/carrito/${encodeURIComponent(id)}`)
    );
  }

  vaciar(): Promise<boolean> {
    return this.enviar(this.http.delete<CarritoApi>(`${API_URL}/carrito`));
  }

  private async enviar(peticion: Observable<CarritoApi>): Promise<boolean> {
    if (!this.sesion.conectado()) {
      void this.router.navigate(['/login']);
      return false;
    }

    try {
      this.carrito.set(await firstValueFrom(peticion));
      this.error.set('');
      return true;
    } catch (error) {
      this.error.set(mensajeDeError(error));
      return false;
    }
  }
}
