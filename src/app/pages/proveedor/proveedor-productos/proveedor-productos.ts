import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { mensajeDeError } from '../../../core/api';
import { Producto } from '../../../core/models/producto.model';
import { ProveedorService } from '../../../core/services/proveedor.service';

type Filtro = 'todos' | 'publicados' | 'ocultos';
 
@Component({
   selector: 'app-proveedor-productos',
  imports: [RouterLink, DecimalPipe],
   templateUrl: './proveedor-productos.html',
   styleUrl: './proveedor-productos.css'
 })

export class ProveedorProductos implements OnInit {
  private readonly api = inject(ProveedorService);

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly ocupado = signal<string | null>(null);
  readonly filtro = signal<Filtro>('todos');
  readonly busqueda = signal('');

  readonly visibles = computed(() => {
    const texto = busquedaNormal(this.busqueda());
    return this.productos().filter(
      p =>
        (this.filtro() === 'todos' || (this.filtro() === 'publicados') === p.activo) &&
        busquedaNormal(p.titulo).includes(texto)
    );
  });

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.productos.set(await this.api.productos());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  alternarPublicacion(producto: Producto): Promise<void> {
    return this.cambiar(producto, { activo: !producto.activo });
  }

  guardarStock(producto: Producto, texto: string): Promise<void> {
    const stock = Number(texto);
    if (texto.trim() === '' || !Number.isInteger(stock) || stock < 0) {
      this.error.set('El stock debe ser un número entero de 0 en adelante.');
      return Promise.resolve();
    }
    return stock === producto.stock ? Promise.resolve() : this.cambiar(producto, { stock });
  }

  private async cambiar(producto: Producto, cambios: { activo?: boolean; stock?: number }): Promise<void> {
    if (this.ocupado()) {
      return;
    }
    this.ocupado.set(producto.slug);
    this.error.set('');
    try {
      const actualizado = await this.api.editarProducto(producto.slug, cambios);
      this.productos.update(lista => lista.map(p => (p.slug === actualizado.slug ? actualizado : p)));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.ocupado.set(null);
    }
  }
}

function busquedaNormal(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}