import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/api';
import { MalvinoChatbot } from './malvino-chatbot';
const CATALOGO={modelos:[{slug:'iphone-13',nombre:'iPhone 13'},{slug:'iphone-14',nombre:'iPhone 14'}],accesorios:[{slug:'case-iphone-13',titulo:'Case para iPhone 13',tipo_accesorio:'case',modelos:['iphone-13']}]};
describe('Chat',()=>{
 let http:HttpTestingController;
 beforeEach(async()=>{await TestBed.configureTestingModule({imports:[MalvinoChatbot],providers:[provideHttpClient(),provideHttpClientTesting()]}).compileComponents();http=TestBed.inject(HttpTestingController);});
 it('ignora vacíos, responde, escapa HTML y borra la conversación',async()=>{const f=TestBed.createComponent(MalvinoChatbot);const c=f.componentInstance;http.expectOne(`${API_URL}/compatibilidad`).flush(CATALOGO);c.send(' ');expect(c.messages().length).toBe(1);c.send('<img src=x onerror=alert(1)>');await f.whenStable();expect(c.messages().length).toBe(3);expect(f.nativeElement.querySelector('.messages img')).toBeNull();c.clear();expect(c.messages().length).toBe(1);});
 it('carga el catálogo y comprueba la compatibilidad con el backend',async()=>{const f=TestBed.createComponent(MalvinoChatbot);const c=f.componentInstance;http.expectOne(`${API_URL}/compatibilidad`).flush(CATALOGO);await new Promise(r=>setTimeout(r));await f.whenStable();expect(f.nativeElement.textContent).toContain('Case para iPhone 13');expect(c.accessory).toBe('case-iphone-13');c.model='iphone-14';const envio=c.check();http.expectOne(`${API_URL}/compatibilidad/case-iphone-13?modelo=iphone-14`).flush({compatible:false,accesorio:{titulo:'Case para iPhone 13'},modelo:{nombre:'iPhone 14'},alternativas:[{titulo:'Case para iPhone 14'}]});await envio;expect(c.messages().at(-1)?.text).toContain('sí tenemos: Case para iPhone 14');});
 it('muestra el aviso si el catálogo no carga',async()=>{const f=TestBed.createComponent(MalvinoChatbot);http.expectOne(`${API_URL}/compatibilidad`).flush({error:'Error interno'},{status:500,statusText:'Error'});await new Promise(r=>setTimeout(r));await f.whenStable();expect(f.nativeElement.textContent).toContain('Error interno');});
});
