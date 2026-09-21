import { Injectable } from '@angular/core';
export const DEMO_ACCESSORIES = [
 {id:'case-13',name:'Case de ejemplo para iPhone 13',type:'case',models:['iphone 13']},
 {id:'case-14',name:'Case de ejemplo para iPhone 14',type:'case',models:['iphone 14']},
 {id:'glass-13',name:'Protector de ejemplo para iPhone 13',type:'protector',models:['iphone 13']},
 {id:'battery-a32-4g',name:'Batería de ejemplo para Samsung A32 4G',type:'bateria',models:['samsung a32 4g']},
 {id:'battery-a32-5g',name:'Batería de ejemplo para Samsung A32 5G',type:'bateria',models:['samsung a32 5g']},
 {id:'charger-13',name:'Kit cargador de ejemplo para iPhone 13',type:'cargador',models:['iphone 13']}
];
export const DEMO_MODELS=['iphone 13','iphone 14','samsung a32 4g','samsung a32 5g'];
@Injectable({providedIn:'root'})
export class MalvinoService {
  check(accessoryId:string,model:string):string {
    const a=DEMO_ACCESSORIES.find(a=>a.id===accessoryId);
    if(!a || !DEMO_MODELS.includes(model)) return 'Selecciona un accesorio y un modelo de la demostración.';
    if(a.models.includes(model)) return `Según la ficha de ejemplo, ${a.name} es compatible con ${model}. Esta respuesta usa datos ficticios de prueba; no confirma compatibilidad ni stock de un producto real.`;
    const alternative=DEMO_ACCESSORIES.find(p=>p.type===a.type && p.models.includes(model));
    return `La ficha de ejemplo de ${a.name} no incluye ${model}. `+(alternative ? `Alternativa de demostración: ${alternative.name}.` : 'No tengo una alternativa para ese modelo en las fichas de prueba. Consulta el modelo exacto y la referencia con el vendedor.');
  }
  answer(text:string):string {
    const q=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(/bateria|case|funda|protector|cargador|compatible|compatibilidad/.test(q)) {
      if(/a32/.test(q) && !/4g|5g/.test(q)) return '¿Tu Samsung A32 es 4G o 5G? Necesito la variante exacta y la referencia del accesorio. Puedes usar el comprobador de fichas de ejemplo.';
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
