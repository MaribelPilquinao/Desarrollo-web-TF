import { Component, inject, signal, OnInit, computed  } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';

import { DatePipe } from '@angular/common';
import { CarritoService } from '../../core/services/carrito.service';
import { ConsultaService } from '../../core/services/consulta.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { Opinion, OpinionService } from '../../core/services/opinion.service';
import { SesionService } from '../../core/services/sesion.service';
import {ProductoService, ProductoDetalle as ProductoDetalleApi } from '../../services/producto';
import { mensajeDeError } from '../../core/api';

@Component({
  selector: 'app-producto-detalle',
  imports: [RouterLink, DatePipe],
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.css'
})
export class ProductoDetalle implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly productoService = inject(ProductoService);
  private readonly favoritosService = inject(FavoritosService);
  private readonly carritoService = inject(CarritoService);
  private readonly opinionService = inject(OpinionService);
  private readonly consultaService = inject(ConsultaService);
  private readonly sesion = inject(SesionService);

  // Opinar y preguntar al vendedor son acciones de cliente.
  readonly esCliente = computed(() => this.sesion.usuario()?.rol === 'cliente');
  readonly conectado = this.sesion.conectado;

  productoBackend = signal<ProductoDetalleApi | null>(null);

  cargandoProducto = signal(false);
  errorProducto = signal('');

  readonly productoAgregado = signal(false);

  ngOnInit(): void {
  this.route.paramMap.subscribe(params => {
    const slug = params.get('slug');

    if (slug) {
      this.cargarProducto(slug);
    }
  });
}

  cargarProducto(slug: string): void {
  this.cargandoProducto.set(true);
  this.errorProducto.set('');

  this.productoService.obtenerProductoPorSlug(slug).subscribe({
    next: (producto) => {
      this.productoBackend.set(producto);

      // Si el backend trae varias imágenes
      if (producto.imagenes?.length) {
        this.imagenes = producto.imagenes.map((imagen, index) => ({
          miniatura: imagen.url,
          completa: imagen.url,
          alt: `${producto.titulo} - imagen ${index + 1}`
        }));

        this.imagenPrincipal = this.imagenes[0].completa;
      }

      // Si no hay galería, usamos la imagen principal del producto
      else if (producto.imagen_url) {
        this.imagenes = [
         {
           miniatura: producto.imagen_url,
           completa: producto.imagen_url,
           alt: producto.titulo
         }
       ];

       this.imagenPrincipal = producto.imagen_url;
     }

      this.cantidad = 1;
      this.cargandoProducto.set(false);

      void this.cargarOpiniones(slug);
    },

    error: (error) => {
      this.errorProducto.set(mensajeDeError(error));
      this.cargandoProducto.set(false);

      console.error('Error al cargar producto:', error);
    }
  });
}

  imagenPrincipal =
    'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200';
  
  producto = {
  id: 'hp-omen-16',
  nombre: 'Laptop Gaming HP OMEN 16 - Intel Core i7, 16GB RAM, RTX 3070',
  calificacion: '⭐⭐⭐⭐☆',
  opiniones: 342,
  stock: 15,
  vendedor: 'TechPower Store',
  garantia: '12 meses',
  descuento: 24,
  envioGratis: true,
  promedio: 4.5,
  precioAnterior: 'S/ 7,299',
  precioActual: 'S/ 5,547',
  ahorro: 'S/ 1,752'
};

productoVista = computed(() => {
  const backend = this.productoBackend();

  // Mientras el backend no responda,
  // utilizamos el producto estático.
  if (!backend) {
    return this.producto;
  }

  return {
    id: backend.slug,
    nombre: backend.titulo,

    calificacion: this.formatearCalificacion(
      backend.calificacion_prom
    ),

    opiniones: backend.num_opiniones ?? 0,

    stock: backend.stock,

    descuento: backend.descuento_pct ?? 0,

    envioGratis: backend.tipo_envio === 'gratis',

    promedio: backend.calificacion_prom ?? 0,

    vendedor:
      backend.proveedor || 'Proveedor no disponible',

    garantia:
      backend.garantia_meses != null
        ? `${backend.garantia_meses} meses`
        : 'No especificada',

    precioAnterior:
      backend.precio_anterior != null
        ? this.formatearPrecio(backend.precio_anterior)
        : '',

    precioActual:
      this.formatearPrecio(backend.precio_actual),

    ahorro:
      backend.precio_anterior != null
        ? this.formatearPrecio(
            Math.max(
              backend.precio_anterior - backend.precio_actual,
              0
            )
          )
        : 'S/ 0'
  };
});

descripcionVista = computed(() => {
  const backend = this.productoBackend();

  if (backend?.descripcion?.trim()) {
    return backend.descripcion;
  }

  return `La HP OMEN 16 es una laptop gamer diseñada para ofrecer
  alto rendimiento en juegos exigentes y tareas de productividad.
  Cuenta con procesador Intel Core i7, 16GB de RAM y tarjeta
  gráfica NVIDIA RTX 3070.`;
});

categoriaVista = computed(() => {
  return this.productoBackend()?.categoria || 'Laptops';
});

especificacionesEstaticas = [
  { clave: 'Procesador', valor: 'Intel Core i7 (12ª gen)', orden: 1 },
  { clave: 'Memoria RAM', valor: '16GB DDR5', orden: 2 },
  { clave: 'Almacenamiento', valor: '1TB SSD NVMe', orden: 3 },
  { clave: 'Gráficos', valor: 'NVIDIA GeForce RTX 3070', orden: 4 },
  { clave: 'Pantalla', valor: '16" FHD 144Hz', orden: 5 },
  { clave: 'Sistema operativo', valor: 'Windows 11', orden: 6 },
  { clave: 'Conectividad', valor: 'Wi-Fi 6, Bluetooth 5.2', orden: 7 },
  { clave: 'Puertos', valor: 'USB-C, USB-A, HDMI, RJ-45', orden: 8 },
  { clave: 'Peso', valor: '2.3 kg aprox.', orden: 9 },
  { clave: 'Color', valor: 'Negro sombra', orden: 10 }
];

especificacionesVista = computed(() => {
  const backend = this.productoBackend();

  if (backend?.especificaciones?.length) {
    return backend.especificaciones;
  }

  return this.especificacionesEstaticas;
});

formatearPrecio(precio: number): string {
  return `S/ ${precio.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

formatearCalificacion(calificacion: number | null): string {
  if (calificacion == null) {
    return this.producto.calificacion;
  }

  const estrellas = Math.max(
    0,
    Math.min(5, Math.round(calificacion))
  );

  return (
    '⭐'.repeat(estrellas) +
    '☆'.repeat(5 - estrellas)
  );
}



configuraciones = [
  '16GB RAM • 1TB SSD',
  '32GB RAM • 1TB SSD',
  '32GB RAM • 2TB SSD'
];

configuracionSeleccionada = '16GB RAM • 1TB SSD';

seleccionarConfiguracion(configuracion: string): void {
  this.configuracionSeleccionada = configuracion;
}

  imagenes = [
    {
      miniatura:
        'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400',
      completa:
        'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Vista 1'
    },
    {
      miniatura:
        'https://images.pexels.com/photos/374074/pexels-photo-374074.jpeg?auto=compress&cs=tinysrgb&w=400',
      completa:
        'https://images.pexels.com/photos/374074/pexels-photo-374074.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Vista 2'
    },
    {
      miniatura:
        'https://images.pexels.com/photos/177598/pexels-photo-177598.jpeg?auto=compress&cs=tinysrgb&w=400',
      completa:
        'https://images.pexels.com/photos/177598/pexels-photo-177598.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Vista 3'
    }
  ];

  cambiarImagen(imagen: string): void {
    this.imagenPrincipal = imagen;
  }

  cantidad = 1;

aumentarCantidad(): void {
  if (this.cantidad < this.productoVista().stock) {
    this.cantidad++;
  }
}

disminuirCantidad(): void {
  if (this.cantidad > 1) {
    this.cantidad--;
  }
}

esFavorito(): boolean {
  return this.favoritosService.esFavorito(
    this.productoVista().id
  );
}

alternarFavorito(): void {
  const producto = this.productoVista();

  this.favoritosService.alternar({
    id: producto.id,
    title: producto.nombre,
    price: this.convertirPrecio(producto.precioActual),
    img: this.imagenPrincipal
  });
}

convertirPrecio(precio: string): number {
  return Number(
    precio.replace(/[^\d.]/g, '')
  ) || 0;
}

async agregarAlCarrito(): Promise<void> {
  const producto = this.productoVista();
  const agregado = await this.carritoService.agregar(
    {
      id: producto.id,
      title: producto.nombre,
      price: this.convertirPrecio(producto.precioActual),
      img: this.imagenPrincipal
    },
    this.cantidad
  );

  if (agregado) {
    this.mostrarConfirmacionCarrito();
  }
}

mostrarConfirmacionCarrito(): void {
  this.productoAgregado.set(true);

  setTimeout(() => {
    this.productoAgregado.set(false);
  }, 900);
}

/** Opiniones */

readonly opiniones = signal<Opinion[]>([]);
readonly errorOpiniones = signal('');
readonly calificacionNueva = signal(5);
readonly enviandoOpinion = signal(false);
readonly avisoOpinion = signal('');

async cargarOpiniones(slug: string): Promise<void> {
  this.errorOpiniones.set('');

  try {
    this.opiniones.set(await this.opinionService.listar(slug));
  } catch (error) {
    this.opiniones.set([]);
    this.errorOpiniones.set(mensajeDeError(error));
  }
}

async opinar(comentario: HTMLTextAreaElement): Promise<void> {
  const producto = this.productoBackend();

  if (!producto || this.enviandoOpinion()) {
    return;
  }

  this.enviandoOpinion.set(true);
  this.errorOpiniones.set('');
  this.avisoOpinion.set('');

  try {
    const resumen = await this.opinionService.opinar(
      producto.slug,
      this.calificacionNueva(),
      comentario.value.trim()
    );

    // El backend devuelve el promedio ya recalculado.
    this.productoBackend.set({ ...producto, ...resumen });
    comentario.value = '';
    this.avisoOpinion.set('¡Gracias! Tu opinión quedó publicada.');

    await this.cargarOpiniones(producto.slug);
  } catch (error) {
    this.errorOpiniones.set(mensajeDeError(error));
  } finally {
    this.enviandoOpinion.set(false);
  }
}

/** Consulta al vendedor */

readonly enviandoConsulta = signal(false);
readonly avisoConsulta = signal('');
readonly errorConsulta = signal('');

async preguntar(mensaje: HTMLTextAreaElement): Promise<void> {
  const producto = this.productoBackend();
  const texto = mensaje.value.trim();

  if (!producto || this.enviandoConsulta()) {
    return;
  }

  this.avisoConsulta.set('');

  if (!texto) {
    this.errorConsulta.set('Escribe tu pregunta antes de enviarla.');
    return;
  }

  this.enviandoConsulta.set(true);
  this.errorConsulta.set('');

  try {
    await this.consultaService.preguntar(producto.slug, texto);
    mensaje.value = '';
    this.avisoConsulta.set('Enviamos tu pregunta al vendedor.');
  } catch (error) {
    this.errorConsulta.set(mensajeDeError(error));
  } finally {
    this.enviandoConsulta.set(false);
  }
}
}