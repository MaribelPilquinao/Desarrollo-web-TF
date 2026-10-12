import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { API_URL } from '../api';

export interface ModeloCelular { slug: string; nombre: string; }
export interface Accesorio { slug: string; titulo: string; tipo_accesorio: string; modelos: string[]; }
export interface CatalogoCompatibilidad { modelos: ModeloCelular[]; accesorios: Accesorio[]; }
interface Compatibilidad {
  compatible: boolean;
  accesorio: { titulo: string };
  modelo: { nombre: string };
  alternativas: { titulo: string }[];
}

export interface ProductoRecomendado {
  id: number;
  slug: string;
  nombre: string;
  precio: number;
  stock: number;
  imagen_url: string;
}

export interface ChatbotResponse {
  respuesta: string;
  productos?: ProductoRecomendado[];
  puede_escalar?: boolean;
  pregunta_original?: string | null;
}

export interface EscalarResponse {
  mensaje: string;
  escalado_exitoso: boolean;
}

export interface MensajeChat {
  remitente: 'usuario' | 'malvino' | 'sistema';
  texto: string;
  hora: string;
  productos?: ProductoRecomendado[];
  puede_escalar?: boolean;
  pregunta_original?: string | null;
  escalado_enviado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MalvinoService {
  private apiUrl = `${API_URL}/malvino`;

  constructor(private http: HttpClient) {}

  enviarMensaje(mensaje: string): Observable<ChatbotResponse> {
    return this.http.post<ChatbotResponse>(this.apiUrl, {
      accion: 'consultar',
      mensaje
    });
  }

  // La pregunta se guarda como consulta del producto: la responde su proveedor.
  escalarConsulta(pregunta: string, id_producto: number): Observable<EscalarResponse> {
    return this.http.post<EscalarResponse>(this.apiUrl, {
      accion: 'escalar',
      pregunta,
      id_producto
    });
  }

  // Accesorios y modelos del catálogo real, para los desplegables del comprobador.
  catalogo(): Promise<CatalogoCompatibilidad> {
    return firstValueFrom(this.http.get<CatalogoCompatibilidad>(`${API_URL}/compatibilidad`));
  }

  async comprobar(accesorio: string, modelo: string): Promise<string> {
    const r = await firstValueFrom(
      this.http.get<Compatibilidad>(`${API_URL}/compatibilidad/${encodeURIComponent(accesorio)}`, {
        params: new HttpParams().set('modelo', modelo)
      })
    );
    if (r.compatible) {
      return `Sí: según el catálogo de Malvitec, ${r.accesorio.titulo} es compatible con ${r.modelo.nombre}.`;
    }
    const alternativas = r.alternativas.map(a => a.titulo).join(', ');
    return `${r.accesorio.titulo} no figura como compatible con ${r.modelo.nombre}. ` +
      (alternativas
        ? `Para ese modelo sí tenemos: ${alternativas}.`
        : 'No tenemos una alternativa de ese tipo para ese modelo. Consulta el modelo exacto con el vendedor.');
  }
}
