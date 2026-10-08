import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Registro } from './registro';
import { API_URL } from '../../core/api';
function llenar(c:Registro):void {c.form.setValue({name:'Ana Torres',email:'ana@correo.com',phone:'987654321',password:'Malvitec123!',confirm:'Malvitec123!',address:'',payment:'Yape'});}
describe('Registro',()=>{
 let http:HttpTestingController;
 beforeEach(async()=>{localStorage.clear();await TestBed.configureTestingModule({imports:[Registro],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]}).compileComponents();http=TestBed.inject(HttpTestingController);});
 it('rechaza vacíos, celular inválido y contraseñas distintas',()=>{const c=TestBed.createComponent(Registro).componentInstance;c.submit();expect(c.step()).toBe('form');expect(c.form.invalid).toBe(true);llenar(c);c.form.controls.phone.setValue('123');c.submit();expect(c.step()).toBe('form');llenar(c);c.form.controls.confirm.setValue('Otra123!');c.submit();expect(c.form.hasError('mismatch')).toBe(true);});
 it('muestra el error del backend y no avanza',async()=>{const c=TestBed.createComponent(Registro).componentInstance;llenar(c);c.submit();c.verification.setValue('123456');const envio=c.verify();http.expectOne(`${API_URL}/auth/registro`).flush({error:'Ya existe una cuenta con ese correo'},{status:409,statusText:'Conflict'});await envio;expect(c.error()).toContain('Ya existe');expect(c.step()).toBe('verify');});
 it('envía los datos con el código y termina el registro',async()=>{const f=TestBed.createComponent(Registro);const c=f.componentInstance;llenar(c);c.submit();expect(c.step()).toBe('verify');c.verification.setValue('12');await c.verify();http.expectNone(`${API_URL}/auth/registro`);c.verification.setValue('123456');const envio=c.verify();const req=http.expectOne(`${API_URL}/auth/registro`);expect(req.request.body).toEqual({nombre:'Ana Torres',correo:'ana@correo.com',telefono:'987654321',contrasena:'Malvitec123!',preferencia_pago:'yape',codigo:'123456'});req.flush({id:2,nombre:'Ana Torres',correo:'ana@correo.com'},{status:201,statusText:'Created'});await envio;await f.whenStable();expect(c.step()).toBe('done');expect(f.nativeElement.textContent).toContain('Cuenta creada');});
});
