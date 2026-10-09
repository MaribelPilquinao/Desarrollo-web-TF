export type EstadoPedido = 'Pendiente' | 'En camino' | 'Completado' | 'Entregado' | 'Cancelado';

export interface Pedido {
  id: number;
  codigo: string;
  fecha: string;
  cliente: string;
  telefono: string;
  departamento: string;
  distrito: string;
  direccion: string;
  referencia: string | null;
  metodo_pago: 'Tarjeta' | 'QR' | 'Cash' | 'Transferencia';
  producto: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  estado: EstadoPedido;
}