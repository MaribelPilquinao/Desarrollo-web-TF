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


export interface ProductoDetalle extends Producto {
  imagenes: ImagenProducto[];
  especificaciones: EspecificacionProducto[];
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
    orden: string = 'relevancia'
  ): Observable<Producto[]> {

    let params = new HttpParams();

    if (buscar?.trim()) {
      params = params.set('buscar', buscar.trim());
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

}