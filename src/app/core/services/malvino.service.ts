import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { API_URL, API_BASE_URL } from '../api';

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
}

export interface MensajeChat {
  remitente: 'usuario' | 'malvino';
  texto: string;
  hora: string;
  productos?: ProductoRecomendado[];
}

@Injectable({
  providedIn: 'root'
})
export class MalvinoService {
  private apiUrl = `${API_BASE_URL}/malvino`;

  constructor(private http: HttpClient) {}

  enviarMensaje(mensaje: string): Observable<ChatbotResponse> {
    return this.http.post<ChatbotResponse>(this.apiUrl, { mensaje });
  }
}
