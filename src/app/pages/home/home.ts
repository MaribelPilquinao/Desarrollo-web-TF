import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {

  productos = [
    {
      id: 'hp-omen-16',
      categoria: 'laptops',
      nombre: 'Laptop Gaming HP OMEN 16 - Intel Core i7, 16GB RAM, RTX 3070',
      imagen: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
      descuento: '24% OFF',
      calificacion: '⭐⭐⭐⭐☆',
      opiniones: 342,
      precioAnterior: 'S/ 7,299',
      precioActual: 'S/ 5,547'
    },
    {
      id: 'iphone-15-pro-max',
      categoria: 'celulares',
      nombre: 'iPhone 15 Pro Max 256GB - Titanio Natural',
      imagen: 'https://images.pexels.com/photos/47261/pexels-photo-47261.jpeg?auto=compress&cs=tinysrgb&w=800',
      descuento: '11% OFF',
      calificacion: '⭐⭐⭐⭐⭐',
      opiniones: 567,
      precioAnterior: 'S/ 6,499',
      precioActual: 'S/ 5,784'
    },
    {
      id: 'sony-wh-1000xm5',
      categoria: 'audio',
      nombre: 'Audífonos Sony WH-1000XM5 - Cancelación de ruido',
      imagen: 'https://images.pexels.com/photos/3394664/pexels-photo-3394664.jpeg?auto=compress&cs=tinysrgb&w=800',
      descuento: '25% OFF',
      calificacion: '⭐⭐⭐⭐⭐',
      opiniones: 423,
      precioAnterior: 'S/ 1,799',
      precioActual: 'S/ 1,349'
    },
    {
      id: 'apple-watch-series-9',
      categoria: 'wearables',
      nombre: 'Apple Watch Series 9 GPS 45mm - Medianoche',
      imagen: 'https://plazavea.vteximg.com.br/arquivos/ids/28839799-418-418/imageUrl_4.jpg',
      descuento: '20% OFF',
      calificacion: '⭐⭐⭐⭐☆',
      opiniones: 289,
      precioAnterior: 'S/ 2,399',
      precioActual: 'S/ 1,919'
    },

    {
      id: 'logitech-g-pro-x',
      categoria: 'perifericos',
      nombre: 'Teclado Mecánico Logitech G Pro X - RGB, Switches GX Blue',
      imagen: 'https://oechsle.vteximg.com.br/arquivos/ids/7324469-1000-1000/imageUrl_2.jpg?v=637810641594700000',
      descuento: '24% OFF',
      calificacion: '⭐⭐⭐⭐⭐',
      opiniones: 178,
      precioAnterior: 'S/ 549',
      precioActual: 'S/ 417'
    },
    {
      id: 'ipad-air-m2',
      categoria: 'tablets',
      nombre: 'iPad Air 11 M2 256GB - Azul',
      imagen: 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=800',
      descuento: '17% OFF',
      calificacion: '⭐⭐⭐⭐⭐',
      opiniones: 412,
      precioAnterior: 'S/ 3,299',
      precioActual: 'S/ 2,738'
    },
    {
      id: 'logitech-mx-master-3s',
      categoria: 'perifericos',
      nombre: 'Mouse Logitech MX Master 3S - Inalámbrico',
      imagen: 'https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg?auto=compress&cs=tinysrgb&w=800',
      descuento: '15% OFF',
      calificacion: '⭐⭐⭐⭐⭐',
      opiniones: 256,
      precioAnterior: 'S/ 429',
      precioActual: 'S/ 364'
    },
    {
      id: 'sony-alpha-a7-iv',
      categoria: 'camaras',
      nombre: 'Cámara Sony Alpha A7 IV - Full Frame 33MP',
      imagen: 'https://images.pexels.com/photos/279906/pexels-photo-279906.jpeg?auto=compress&cs=tinysrgb&w=800',
      descuento: '13% OFF',
      calificacion: '⭐⭐⭐⭐☆',
      opiniones: 199,
      precioAnterior: 'S/ 8,999',
      precioActual: 'S/ 7,829'
    },   

  ];

  categoriaSeleccionada = 'all';

  seleccionarCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
  }

  get productosFiltrados() {
    if (this.categoriaSeleccionada === 'all') {
      return this.productos;
    }

    return this.productos.filter(
      producto => producto.categoria === this.categoriaSeleccionada
    );
  }
}
