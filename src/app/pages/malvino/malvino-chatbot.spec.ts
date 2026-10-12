import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '../../core/api';
import { MalvinoChatbot } from './malvino-chatbot';
const CATALOGO={modelos:[{slug:'iphone-13',nombre:'iPhone 13'},{slug:'iphone-14',nombre:'iPhone 14'}],accesorios:[{slug:'case-iphone-13',titulo:'Case para iPhone 13',tipo_accesorio:'case',modelos:['iphone-13']}]};
const PRODUCTO={id:14,slug:'case-iphone-13',nombre:'Case para iPhone 13',precio:39.9,stock:5,imagen_url:'imagenes/malvitec-logo.png'};
const SESION_KEY='malvitec_sesion';
// Token con vencimiento lejano: SesionService descarta los vencidos al leer localStorage.
const TOKEN=`x.${btoa(JSON.stringify({exp:4102444800}))}.x`;
describe('Chat',()=>{
 let http:HttpTestingController;
 const preparar=async(conSesion=false)=>{
  localStorage.clear();
  if(conSesion)localStorage.setItem(SESION_KEY,JSON.stringify({token:TOKEN,usuario:{id:1,nombre:'Demo',apellidos:null,correo:'demo@malvitec.com',rol:'cliente'}}));
  await TestBed.configureTestingModule({imports:[MalvinoChatbot],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]}).compileComponents();
  http=TestBed.inject(HttpTestingController);
  const f=TestBed.createComponent(MalvinoChatbot);f.detectChanges();
  http.expectOne(`${API_URL}/compatibilidad`).flush(CATALOGO);
  if(conSesion)http.expectOne(`${API_URL}/carrito`).flush({items:[],subtotal:0,costo_envio:0,total:0});
  await new Promise(r=>setTimeout(r));await f.whenStable();
  return f;
 };
 const preguntar=async(f:Awaited<ReturnType<typeof preparar>>,texto:string,respuesta:object)=>{f.componentInstance.mensajeActual=texto;f.componentInstance.enviar();http.expectOne(`${API_URL}/malvino`).flush(respuesta);await f.whenStable();};
 afterEach(()=>localStorage.clear());
 it('ignora vacíos, responde, escapa HTML y borra la conversación',async()=>{const f=await preparar();const c=f.componentInstance;c.mensajeActual=' ';c.enviar();expect(c.mensajes().length).toBe(1);await preguntar(f,'<img src=x onerror=alert(1)>',{respuesta:'No encontré productos para tu consulta.',productos:[],puede_escalar:false,pregunta_original:null});expect(c.mensajes().length).toBe(3);expect(c.mensajeActual).toBe('');expect(f.nativeElement.querySelector('.chat-body img')).toBeNull();expect(f.nativeElement.querySelector('.btn-escalar')).toBeNull();c.borrar();expect(c.mensajes().length).toBe(1);});
 it('muestra los productos sugeridos y el mensaje de error del backend',async()=>{const f=await preparar();const c=f.componentInstance;await preguntar(f,'case iphone 13',{respuesta:'Encontré estos productos relacionados:',productos:[PRODUCTO],puede_escalar:true,pregunta_original:'case iphone 13'});expect(f.nativeElement.querySelector('.tarjeta-producto-chat').textContent).toContain('Case para iPhone 13');expect(f.nativeElement.querySelector('.btn-escalar')).toBeTruthy();c.mensajeActual='hola';c.enviar();http.expectOne(`${API_URL}/malvino`).flush({error:'Error interno'},{status:500,statusText:'Error'});await f.whenStable();expect(c.mensajes().at(-1)?.texto).toBe('Error interno');expect(c.cargando()).toBe(false);});
 it('pide iniciar sesión antes de escalar una pregunta',async()=>{const f=await preparar();const c=f.componentInstance;const ir=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);await preguntar(f,'case iphone 13',{respuesta:'Encontré estos productos relacionados:',productos:[PRODUCTO],puede_escalar:true,pregunta_original:'case iphone 13'});c.escalarDuda(c.mensajes().at(-1)!,PRODUCTO);http.expectNone(`${API_URL}/malvino`);expect(ir).toHaveBeenCalledWith(['/login']);expect(c.mensajes().at(-1)?.remitente).toBe('sistema');});
 it('escala la pregunta original al proveedor del producto elegido',async()=>{const f=await preparar(true);const c=f.componentInstance;await preguntar(f,'case iphone 13',{respuesta:'Encontré estos productos relacionados:',productos:[PRODUCTO],puede_escalar:true,pregunta_original:'case iphone 13'});f.nativeElement.querySelector('.btn-escalar').click();const p=http.expectOne(`${API_URL}/malvino`);expect(p.request.body).toEqual({accion:'escalar',pregunta:'case iphone 13',id_producto:14});p.flush({mensaje:'Tu consulta quedó registrada.',escalado_exitoso:true});await f.whenStable();expect(c.mensajes().at(-1)?.texto).toContain('enviada al proveedor de Case para iPhone 13');expect(f.nativeElement.querySelector('.btn-escalar')).toBeNull();expect(f.nativeElement.querySelector('.escalado-confirmado')).toBeTruthy();});
 it('carga el catálogo y comprueba la compatibilidad con el backend',async()=>{const f=await preparar();const c=f.componentInstance;expect(f.nativeElement.textContent).toContain('Case para iPhone 13');expect(c.accesorio).toBe('case-iphone-13');c.modelo='iphone-14';const envio=c.comprobar();http.expectOne(`${API_URL}/compatibilidad/case-iphone-13?modelo=iphone-14`).flush({compatible:false,accesorio:{titulo:'Case para iPhone 13'},modelo:{nombre:'iPhone 14'},alternativas:[{titulo:'Case para iPhone 14'}]});await envio;expect(c.mensajes().at(-1)?.texto).toContain('sí tenemos: Case para iPhone 14');});
 it('muestra el aviso si el catálogo no carga',async()=>{localStorage.clear();await TestBed.configureTestingModule({imports:[MalvinoChatbot],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]}).compileComponents();http=TestBed.inject(HttpTestingController);const f=TestBed.createComponent(MalvinoChatbot);f.detectChanges();http.expectOne(`${API_URL}/compatibilidad`).flush({error:'Error interno'},{status:500,statusText:'Error'});await new Promise(r=>setTimeout(r));await f.whenStable();expect(f.nativeElement.textContent).toContain('Error interno');});
});
