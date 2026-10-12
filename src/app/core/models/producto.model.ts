export type TipoEnvio = 'gratis' | 'estandar';
export type TipoAccesorio = 'case' | 'protector' | 'bateria' | 'cargador';

export interface Producto {
  slug: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  categoria_nombre: string;
  precio_actual: number;
  precio_anterior: number | null;
  descuento_pct: number;
  stock: number;
  imagen_url: string | null;
  tipo_envio: TipoEnvio;
  garantia_meses: number;
  tipo_accesorio: TipoAccesorio | null;
  activo: boolean;
  actualizado_en: string;
  // Solo vienen al pedir un producto, no en la lista.
  imagenes?: string[];
  especificaciones?: Especificacion[];
}

export interface Especificacion {
  clave: string;
  valor: string;
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
  imagenes: string[];
  especificaciones: Especificacion[];
}

export interface Categoria {
  slug: string;
  nombre: string;
}