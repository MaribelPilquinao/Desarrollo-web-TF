import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api';


export interface Producto {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  precio_actual: number;
  precio_anterior: number | null;
  descuento_pct: number | null;
  stock: number;
  imagen_url: string;
  tipo_envio: string | null;
  garantia_meses: number | null;
  calificacion_prom: number | null;
  num_opiniones: number;
  tipo_accesorio: string | null;
  proveedor: string;
  categoria: string;
}


export interface ImagenProducto {
  url: string;
  orden: number;
}


export interface EspecificacionProducto {
  clave: string;
  valor: string;
  orden: number;
}


// Cada configuración es otro producto del mismo modelo, con su precio y su stock.
export interface ConfiguracionProducto {
  slug: string;
  nombre: string;
  precio_actual: number;
  stock: number;
}


export interface ProductoDetalle extends Producto {
  imagenes: ImagenProducto[];
  especificaciones: EspecificacionProducto[];
  configuraciones: ConfiguracionProducto[];
}


// Lo que envía el proveedor al crear o editar. categoria es el slug: 'laptops', 'audio', etc.
export interface DatosProducto {
  titulo: string;
  categoria: string;
  precio_actual: number;
  precio_anterior: number | null;
  descuento_pct: number;
  stock: number;
  imagen_url: string;
  descripcion: string;
  tipo_envio: string;
  garantia_meses: number;
  tipo_accesorio: string | null;
}


@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${API_URL}/productos`;


  listarProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl);
  }


  buscarProductos(
    buscar?: string,
    orden: string = 'relevancia',
    categoria?: string
  ): Observable<Producto[]> {

    let params = new HttpParams();

    if (buscar?.trim()) {
      params = params.set('buscar', buscar.trim());
    }

    if (categoria) {
      params = params.set('categoria', categoria);
    }

    if (orden) {
      params = params.set('orden', orden);
    }

    return this.http.get<Producto[]>(
      this.apiUrl,
      { params }
    );
  }


  obtenerProductoPorSlug(
    slug: string
  ): Observable<ProductoDetalle> {

    return this.http.get<ProductoDetalle>(
      `${this.apiUrl}/${encodeURIComponent(slug)}`
    );
  }


  // Productos del proveedor con sesión iniciada.
  listarMios(): Observable<Producto[]> {
    return this.http.get<Producto[]>(
      this.apiUrl,
      { params: new HttpParams().set('mios', '1') }
    );
  }


  crear(datos: DatosProducto): Observable<ProductoDetalle> {
    return this.http.post<ProductoDetalle>(this.apiUrl, datos);
  }


  editar(
    slug: string,
    datos: Partial<DatosProducto>
  ): Observable<ProductoDetalle> {

    return this.http.put<ProductoDetalle>(
      `${this.apiUrl}/${encodeURIComponent(slug)}`,
      datos
    );
  }


  eliminar(slug: string): Observable<unknown> {
    return this.http.delete(
      `${this.apiUrl}/${encodeURIComponent(slug)}`
    );
  }

}