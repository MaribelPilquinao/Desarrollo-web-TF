import { HttpErrorResponse } from '@angular/common/http';

export const API_URL = 'https://y1fqqcqake.execute-api.us-east-1.amazonaws.com/v1';

export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // Las Lambdas responden { "error": "..." } con un mensaje que se puede mostrar tal cual.
    if (typeof error.error?.error === 'string') {
      return error.error.error;
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
