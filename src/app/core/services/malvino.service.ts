import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api';

export interface ProductoRecomendado {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  imagen_url: string;
}

export interface ChatbotResponse {
  respuesta: string;
  productos?: ProductoRecomendado[];
  puede_escalar?: boolean;
  pregunta_original?: string;
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
  pregunta_original?: string;
  escalado_enviado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MalvinoService {
  private apiUrl = `${API_BASE_URL}/malvino`;

  constructor(private http: HttpClient) {}

  enviarMensaje(mensaje: string): Observable<ChatbotResponse> {
    return this.http.post<ChatbotResponse>(this.apiUrl, {
      accion: 'consultar',
      mensaje
    });
  }

  escalarConsulta(pregunta: string, id_producto?: number): Observable<EscalarResponse> {
    return this.http.post<EscalarResponse>(this.apiUrl, {
      accion: 'escalar',
      pregunta,
      id_producto
    });
  }
}
