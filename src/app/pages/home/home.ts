import { Component, inject, signal, effect, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CarritoService } from '../../core/services/carrito.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ProductoService, Producto } from '../../services/producto';
import { mensajeDeError } from '../../core/api';
import { CATEGORIAS, estrellas, soles } from '../../core/formato';
import { BusquedaService } from '../../core/services/busqueda.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  private readonly productoService = inject(ProductoService);
  private readonly busquedaService = inject(BusquedaService);

  productosBackend = signal<Producto[]>([]);

  cargandoProductos = signal(false);
  errorProductos = signal('');

  terminoBusqueda = signal('');
  ordenSeleccionado = signal('relevancia');
  categoriaSeleccionada = 'all';

  readonly estrellas = estrellas;
  readonly soles = soles;

  private peticion?: Subscription;

  constructor() {
    // Carga al entrar y cada vez que se busca desde la barra superior.
    effect(() => {
      this.terminoBusqueda.set(this.busquedaService.consulta());

      // La barra superior busca en todo el catálogo; después se puede acotar con las categorías.
      this.categoriaSeleccionada = 'all';

      untracked(() => this.cargarProductos());
    });
  }

  cargarProductos(): void {
    this.cargandoProductos.set(true);
    this.errorProductos.set('');

    // Si llega otra búsqueda antes de la respuesta, la anterior se descarta.
    this.peticion?.unsubscribe();

    this.peticion = this.productoService.buscarProductos(
      this.terminoBusqueda(),
      this.ordenSeleccionado(),
      this.categoriaSeleccionada === 'all' ? undefined : this.categoriaSeleccionada
    ).subscribe({
      next: (productos) => {
        this.productosBackend.set(productos);
        this.cargandoProductos.set(false);
      },

      error: (error) => {
        this.errorProductos.set(mensajeDeError(error));
        this.cargandoProductos.set(false);
      }
    });
  }

  cambiarOrden(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.ordenSeleccionado.set(select.value);

    this.cargarProductos();
  }

  seleccionarCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;

    this.cargarProductos();
  }

  tituloSeccion(): string {
    const categoria = CATEGORIAS.find(c => c.slug === this.categoriaSeleccionada)?.nombre ?? 'Todos los productos';

    return this.terminoBusqueda()
      ? `Resultados de "${this.terminoBusqueda()}" en ${categoria.toLowerCase()}`
      : categoria;
  }

  /** Favoritos y carrito */

  private readonly favoritosService = inject(FavoritosService);
  private readonly carritoService = inject(CarritoService);

  readonly productoAgregadoId = signal<string | null>(null);

  esFavorito(slug: string): boolean {
    return this.favoritosService.esFavorito(slug);
  }

  alternarFavorito(producto: Producto): void {
    this.favoritosService.alternar({
      id: producto.slug,
      title: producto.titulo,
      price: producto.precio_actual,
      img: producto.imagen_url
    });
  }

  async agregarAlCarrito(producto: Producto): Promise<void> {
    const agregado = await this.carritoService.agregar({
      id: producto.slug,
      title: producto.titulo,
      price: producto.precio_actual,
      img: producto.imagen_url
    });
    if (!agregado) {
      return;
    }

    this.productoAgregadoId.set(producto.slug);

    setTimeout(() => {
      this.productoAgregadoId.set(null);
    }, 900);
  }
}
