import { Injectable } from '@angular/core';
import { Producto } from '../models/producto.model';

const STORAGE_KEY = 'malvitec_productos_proveedor';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private leer(): Producto[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  private guardar(productos: Producto[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
  }

  listarPorProveedor(proveedorId: string): Producto[] {
    return this.leer().filter(p => p.proveedorId === proveedorId);
  }

  agregar(producto: Omit<Producto, 'id'>): Producto {
    const nuevo: Producto = { ...producto, id: crypto.randomUUID() };
    const productos = this.leer();
    productos.push(nuevo);
    this.guardar(productos);
    return nuevo;
  }

  eliminar(id: string): void {
    this.guardar(this.leer().filter(p => p.id !== id));
  }
}