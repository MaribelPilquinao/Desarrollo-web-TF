export interface Consulta {
  id: number;
  cliente: string;
  producto: string;
  producto_slug: string;
  mensaje: string;
  respuesta: string | null ;
  estado: 'Nueva' | 'Respondida';
  fecha: string;
  respondida_en: string | null;
}