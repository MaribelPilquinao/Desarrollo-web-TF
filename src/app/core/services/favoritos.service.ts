import { Injectable, computed, signal } from '@angular/core';

const FAV_KEY = 'malvitec_favorites';

export interface Favorito {
  id: string;
  title: string;
  price: number;
  img: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private readonly lista = signal<Favorito[]>(this.leer());

  readonly favoritos = this.lista.asReadonly();
  readonly cantidad = computed(() => this.lista().length);

  esFavorito(id: string): boolean {
    return this.lista().some(favorito => favorito.id === id);
  }

  alternar(favorito: Favorito): void {
    if (this.esFavorito(favorito.id)) {
      this.quitar(favorito.id);
    } else {
      this.guardar([...this.lista(), favorito]);
    }
  }

  quitar(id: string): void {
    this.guardar(this.lista().filter(favorito => favorito.id !== id));
  }

  private leer(): Favorito[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const datos = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  private guardar(favoritos: Favorito[]): void {
    this.lista.set(favoritos);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FAV_KEY, JSON.stringify(favoritos));
    }
  }
}
