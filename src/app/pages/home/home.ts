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
    }
  ];

}
