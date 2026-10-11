import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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

// Modelos que reconoce el chat de respuestas programadas.
export const DEMO_MODELS=['iphone 13','iphone 14','samsung a32 4g','samsung a32 5g'];
@Injectable({providedIn:'root'})
export class MalvinoService {
  private readonly http = inject(HttpClient);

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
  answer(text:string):string {
    const q=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(/bateria|case|funda|protector|cargador|compatible|compatibilidad/.test(q)) {
      if(/a32/.test(q) && !/4g|5g/.test(q)) return '¿Tu Samsung A32 es 4G o 5G? Necesito la variante exacta y la referencia del accesorio. Puedes usar el comprobador de compatibilidad.';
      const model=DEMO_MODELS.find(m=>q.includes(m));
      if(!model) return 'Indica el modelo exacto del celular y la referencia del accesorio. Puedo demostrar consultas para iPhone 13, iPhone 14 y Samsung A32 4G/5G. No debo asumir que un accesorio sirve solo por su apariencia.';
      return `Para ${model}, selecciona el accesorio exacto en el comprobador. “Este case” o “esta batería” no identifican una referencia; no puedo confirmar su compatibilidad sin esa información.`;
    }
    if(/registr|cuenta/.test(q)) return 'Abre Crear cuenta de prueba. Completa nombre, correo, celular y contraseña. Puedes añadir dirección y preferencia de pago. El código simulado es 123456; no se envían mensajes. Solo existe demo@malvitec.com.';
    if(/contrasena|recuper|sesion/.test(q)) return 'El usuario de prueba es demo@malvitec.com y su contraseña es Malvitec123!. En el login hay una recuperación simulada con código 123456. No se crean cuentas reales.';
    if(/pago|yape|plin/.test(q)) return 'El caso contempla tarjeta, Yape y Plin. Esta entrega no procesa pagos ni solicita números de tarjeta; el registro solo permite elegir una preferencia.';
    if(/pedido|promocion/.test(q)) return 'El seguimiento de pedidos y las promociones forman parte del caso completo. No consulto compras reales ni genero promociones en esta demostración.';
    if(/hola|buenas|ayuda/.test(q)) return '¡Hola! Soy Malvino. Te ayudo con el acceso de prueba y con consultas guiadas de compatibilidad de accesorios. Usa el comprobador o pregunta por un modelo concreto.';
    return 'No tengo una respuesta programada para esa consulta. Puedo explicar el registro, el login, la recuperación simulada y cómo comprobar fichas de accesorios. No utilizo IA ni consultas externas.';
  }
}
