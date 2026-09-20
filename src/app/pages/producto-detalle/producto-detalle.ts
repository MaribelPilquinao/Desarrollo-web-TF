import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-producto-detalle',
  imports: [RouterLink],
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.css'
})
export class ProductoDetalle implements OnInit {

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
private readonly FAV_KEY = 'malvitec_favorites';

favoritos: {
  id: string;
  title: string;
  price: number;
  img: string;
}[] = [];

ngOnInit(): void {
  this.cargarFavoritos();
}
cargarFavoritos(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const favoritosGuardados = localStorage.getItem(this.FAV_KEY);

  if (!favoritosGuardados) {
    this.favoritos = [];
    return;
  }

  try {
    const datos = JSON.parse(favoritosGuardados);

    this.favoritos = Array.isArray(datos)
      ? datos
      : [];
  } catch {
    this.favoritos = [];
  }
}


esFavorito(): boolean {
  return this.favoritos.some(
    favorito => favorito.id === this.producto.id
  );
}


alternarFavorito(): void {

  const existe = this.esFavorito();

  if (existe) {

    this.favoritos = this.favoritos.filter(
      favorito => favorito.id !== this.producto.id
    );

  } else {

    this.favoritos.push({
      id: this.producto.id,
      title: this.producto.nombre,
      price: this.convertirPrecio(
        this.producto.precioActual
      ),
      img: this.imagenes[0].completa
    });

  }

  this.guardarFavoritos();
}


guardarFavoritos(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(
    this.FAV_KEY,
    JSON.stringify(this.favoritos)
  );
}


convertirPrecio(precio: string): number {
  return Number(
    precio.replace(/[^\d.]/g, '')
  ) || 0;
}

private readonly CART_KEY = 'malvitec_cart';
agregarAlCarrito(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const carritoGuardado = localStorage.getItem(this.CART_KEY);

  let carrito = carritoGuardado
    ? JSON.parse(carritoGuardado)
    : [];

  const productoExistente = carrito.find(
    (item: any) => item.id === this.producto.id
  );

  if (productoExistente) {
    productoExistente.qty += this.cantidad;
  } else {
    carrito.push({
      id: this.producto.id,
      title: this.producto.nombre,
      price: this.convertirPrecio(this.producto.precioActual),
      img: this.imagenes[0].completa,
      qty: this.cantidad
    });
  }

  localStorage.setItem(
    this.CART_KEY,
    JSON.stringify(carrito)
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