export interface Consulta {
  id: number;
  cliente: number;
  producto: string;
  producto_slug: string;
  mensaje: string;
  respuesta: string | null ;
  estado: 'Nueva' | 'Respondida';
  fecha: string;
  respuesta_fecha: string | null;
}