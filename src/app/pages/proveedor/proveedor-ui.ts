import { EstadoPedido } from '../../core/models/pedido.model';

/** Clase de Bootstrap para la insignia de cada estado de pedido. */
export function claseEstado(estado: EstadoPedido): string {
  switch (estado) {
    case 'Pendiente':
      return 'bg-warning text-dark';
    case 'En camino':
      return 'bg-info text-dark';
    case 'Completado':
    case 'Entregado':
      return 'bg-success';
    default:
      return 'bg-secondary';
  }
}

export const METODOS_PAGO: Record<string, string> = {
  tarjeta: 'Tarjeta',
  yape_plin: 'Yape / Plin',
  contra_entrega: 'Contra entrega'
};