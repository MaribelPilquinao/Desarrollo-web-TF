import { Injectable } from '@angular/core';
import { Consulta } from '../models/consulta.model';

@Injectable({ providedIn: 'root' })
export class ConsultaService {
  private consultas: Consulta[] = [
    { id: 'c1', cliente: 'Juan Pérez', producto: 'Mouse Gamer Logitech G502', mensaje: '¿Este mouse es compatible con PS5?', estado: 'Nueva' },
    { id: 'c2', cliente: 'Camila Torres', producto: 'Teclado Mecánico Redragon', mensaje: '¿Incluye switches red?', estado: 'Respondida', respuesta: 'Sí, switches red incluidos.' },
    { id: 'c3', cliente: 'Diego Ramos', producto: 'Audífonos HyperX Cloud II', mensaje: '¿Tiene cancelación de ruido activa?', estado: 'Nueva' }
  ];

  listar(): Consulta[] {
    return this.consultas;
  }

  responder(id: string, respuesta: string): void {
    const c = this.consultas.find(x => x.id === id);
    if (c) { c.respuesta = respuesta; c.estado = 'Respondida'; }
  }
}