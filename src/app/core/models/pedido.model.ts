export type EstadoPedido = 'Pendiente' | 'En camino' | 'Completado' | 'Entregado';

export interface Pedido {
  id: string;
  cliente: string;
  producto: string;
  total: number;
  estado: EstadoPedido;
}