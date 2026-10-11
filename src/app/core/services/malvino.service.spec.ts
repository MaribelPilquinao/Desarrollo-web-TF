import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../api';
import { MalvinoService } from './malvino.service';
describe('Malvino programado',()=>{
 let bot:MalvinoService;let http:HttpTestingController;
 const respuesta=(compatible:boolean,alternativas:{titulo:string}[])=>({compatible,accesorio:{titulo:'Case para iPhone 13'},modelo:{nombre:compatible?'iPhone 13':'iPhone 14'},alternativas});
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});bot=TestBed.inject(MalvinoService);http=TestBed.inject(HttpTestingController);});
 it('confirma la compatibilidad que responde el catálogo',async()=>{const r=bot.comprobar('case-iphone-13','iphone-13');http.expectOne(`${API_URL}/compatibilidad/case-iphone-13?modelo=iphone-13`).flush(respuesta(true,[]));expect(await r).toContain('es compatible con iPhone 13');});
 it('propone las alternativas del catálogo cuando no es compatible',async()=>{const r=bot.comprobar('case-iphone-13','iphone-14');http.expectOne(`${API_URL}/compatibilidad/case-iphone-13?modelo=iphone-14`).flush(respuesta(false,[{titulo:'Case para iPhone 14'}]));expect(await r).toContain('sí tenemos: Case para iPhone 14');});
 it('no inventa alternativas',async()=>{const r=bot.comprobar('case-iphone-13','iphone-14');http.expectOne(`${API_URL}/compatibilidad/case-iphone-13?modelo=iphone-14`).flush(respuesta(false,[]));expect(await r).toContain('No tenemos una alternativa');});
 it('pregunta por la variante del Samsung y la referencia del accesorio',()=>{expect(bot.answer('¿Esta batería sirve para Samsung A32?')).toContain('4G o 5G');expect(bot.answer('¿Este case sirve para un iPhone 13?')).toContain('referencia');});
 it('reconoce consultas fuera del alcance',()=>{expect(bot.answer('¿Qué tiempo hace?')).toContain('No tengo una respuesta programada');});
});
