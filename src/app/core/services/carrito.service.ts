import { Injectable, computed, signal } from '@angular/core';

const CART_KEY = 'malvitec_cart';
const ENVIO_GRATIS_DESDE = 50;
const COSTO_ENVIO = 15;

export interface ItemCarrito {
  id: string;
  title: string;
  price: number;
  img: string;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly lista = signal<ItemCarrito[]>(this.leer());

  readonly items = this.lista.asReadonly();

  readonly cantidadTotal = computed(() =>
    this.lista().reduce((total, item) => total + item.qty, 0)
  );

  readonly subtotal = computed(() =>
    this.lista().reduce((total, item) => total + item.price * item.qty, 0)
  );

  readonly envio = computed(() => {
    const subtotal = this.subtotal();
    return subtotal === 0 || subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;
  });

  readonly total = computed(() => this.subtotal() + this.envio());

  agregar(producto: Omit<ItemCarrito, 'qty'>, cantidad = 1): void {
    const existe = this.lista().some(item => item.id === producto.id);

    if (existe) {
      this.guardar(
        this.lista().map(item =>
          item.id === producto.id ? { ...item, qty: item.qty + cantidad } : item
        )
      );
    } else {
      this.guardar([...this.lista(), { ...producto, qty: cantidad }]);
    }
  }

  cambiarCantidad(id: string, cantidad: number): void {
    if (cantidad < 1) {
      this.quitar(id);
      return;
    }

    this.guardar(
      this.lista().map(item => (item.id === id ? { ...item, qty: cantidad } : item))
    );
  }

  quitar(id: string): void {
    this.guardar(this.lista().filter(item => item.id !== id));
  }

  vaciar(): void {
    this.guardar([]);
  }

  private leer(): ItemCarrito[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const datos = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  private guardar(items: ItemCarrito[]): void {
    this.lista.set(items);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  }
}
