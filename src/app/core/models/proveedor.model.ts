import { Pedido } from './pedido.model';

export interface ResumenProveedor {
  nombre_comercial: string;
  productos_publicados: number;
  sin_stock: number;
  pedidos_pendientes: number;
  consultas_nuevas: number;
  ventas: number;
  ultimos_pedidos: Pedido[];
  productos_sin_stock: { slug: string; titulo: string }[];
}