export interface Producto {
  id: string;
  proveedorId: string;
  titulo: string;
  categoria: string;
  precio: number;
  stock: number;
  img: string;
  desc: string;
  descuento: number;
  envio: 'gratis' | 'estandar';
}