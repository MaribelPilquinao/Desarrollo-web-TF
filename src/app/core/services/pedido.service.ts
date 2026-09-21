import { Injectable } from '@angular/core';
import { Pedido } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidoService {

  private pedidos: Pedido[] = [
    { id: '#4512', cliente: 'José Ramírez', producto: 'Teclado Mecánico RGB', total: 229, estado: 'Pendiente' },
    { id: '#4513', cliente: 'Camila López', producto: 'Audífonos Sony WH-XB910', total: 589, estado: 'Completado' },
    { id: '#4514', cliente: 'Luis Torres', producto: 'Mouse Gamer Logitech G502', total: 189, estado: 'Pendiente' }
  ];

  listarUltimos(): Pedido[] {
    return this.pedidos;
  }

  listarPendientes(): Pedido[] {
    return this.pedidos.filter(p => p.estado === 'Pendiente');
  }
}