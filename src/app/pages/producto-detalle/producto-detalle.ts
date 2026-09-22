import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';
import { FavoritosService } from '../../core/services/favoritos.service';

@Component({
  selector: 'app-producto-detalle',
  imports: [RouterLink],
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.css'
})
export class ProductoDetalle {

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
  precioAnterior: 'S/ 7,299',
  precioActual: 'S/ 5,547',
  ahorro: 'S/ 1,752'
};

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
  if (this.cantidad < this.producto.stock) {
    this.cantidad++;
  }
}

disminuirCantidad(): void {
  if (this.cantidad > 1) {
    this.cantidad--;
  }
}
private readonly favoritosService = inject(FavoritosService);
private readonly carritoService = inject(CarritoService);

esFavorito(): boolean {
  return this.favoritosService.esFavorito(this.producto.id);
}

alternarFavorito(): void {
  this.favoritosService.alternar({
    id: this.producto.id,
    title: this.producto.nombre,
    price: this.convertirPrecio(this.producto.precioActual),
    img: this.imagenes[0].completa
  });
}

convertirPrecio(precio: string): number {
  return Number(
    precio.replace(/[^\d.]/g, '')
  ) || 0;
}

agregarAlCarrito(): void {
  this.carritoService.agregar(
    {
      id: this.producto.id,
      title: this.producto.nombre,
      price: this.convertirPrecio(this.producto.precioActual),
      img: this.imagenes[0].completa
    },
    this.cantidad
  );

  this.mostrarConfirmacionCarrito();
}
productoAgregado = false;
mostrarConfirmacionCarrito(): void {
  this.productoAgregado = true;

  setTimeout(() => {
    this.productoAgregado = false;
  }, 900);
}
}
