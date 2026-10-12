import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../api';
import { MalvinoService } from './malvino.service';
describe('Malvino programado',()=>{
 let bot:MalvinoService;let http:HttpTestingController;
 const respuesta=(compatible:boolean,alternativas:{titulo:string}[])=>({compatible,accesorio:{titulo:'Case para iPhone 13'},modelo:{nombre:compatible?'iPhone 13':'iPhone 14'},alternativas});
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});bot=TestBed.inject(MalvinoService);http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 it('confirma la compatibilidad que responde el catálogo',async()=>{const r=bot.comprobar('case-iphone-13','iphone-13');http.expectOne(`${API_URL}/compatibilidad/case-iphone-13?modelo=iphone-13`).flush(respuesta(true,[]));expect(await r).toContain('es compatible con iPhone 13');});
 it('propone las alternativas del catálogo cuando no es compatible',async()=>{const r=bot.comprobar('case-iphone-13','iphone-14');http.expectOne(`${API_URL}/compatibilidad/case-iphone-13?modelo=iphone-14`).flush(respuesta(false,[{titulo:'Case para iPhone 14'}]));expect(await r).toContain('sí tenemos: Case para iPhone 14');});
 it('no inventa alternativas',async()=>{const r=bot.comprobar('case-iphone-13','iphone-14');http.expectOne(`${API_URL}/compatibilidad/case-iphone-13?modelo=iphone-14`).flush(respuesta(false,[]));expect(await r).toContain('No tenemos una alternativa');});
 it('envía el mensaje del chat a la Lambda de Malvino',async()=>{const r=firstValueFrom(bot.enviarMensaje('laptops'));const p=http.expectOne(`${API_URL}/malvino`);expect(p.request.method).toBe('POST');expect(p.request.body).toEqual({accion:'consultar',mensaje:'laptops'});p.flush({respuesta:'Opciones disponibles en Laptops:',productos:[],puede_escalar:true,pregunta_original:'laptops'});expect((await r).respuesta).toContain('Laptops');});
 it('escala la pregunta al proveedor del producto',async()=>{const r=firstValueFrom(bot.escalarConsulta('¿Trae cargador?',14));const p=http.expectOne(`${API_URL}/malvino`);expect(p.request.body).toEqual({accion:'escalar',pregunta:'¿Trae cargador?',id_producto:14});p.flush({mensaje:'Tu consulta quedó registrada.',escalado_exitoso:true});expect((await r).escalado_exitoso).toBe(true);});
});
