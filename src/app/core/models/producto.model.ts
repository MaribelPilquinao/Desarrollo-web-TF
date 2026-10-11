export type TipoEnvio =  'Gratis' | 'Estandar';
export type TipoAccesorio = 'Case' | 'Protector' | 'Batería' | 'Cargador';

export interface Producto {
  slug: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  categoria_nombre: string;
  precio_actual: number;
  precio_anterior: number;
  descuento_pct: number;
  stock: number;
  imagen_url: string | null;
  tipo_envio: TipoEnvio;
  garantia_meses: number;
  tipo_accesorio: TipoAccesorio | null;
  activo: boolean;
  actualizado: string;

}

export interface DatosProducto {
  titulo: string;
  descripcion: string | null;
  categoria: string;
  precio_actual: number;
  precio_anterior: number | null;
  stock: number;
  imagen_url: string | null;
  tipo_envio: TipoEnvio;
  garantia_meses: number;
  tipo_accesorio: TipoAccesorio | null;
}

export interface Categoria {
  slug: string;
  nombre: string;
}