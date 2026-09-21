export interface Consulta {
  id: string;
  cliente: string;
  producto: string;
  mensaje: string;
  respuesta?: string;
  estado: 'Nueva' | 'Respondida';
}