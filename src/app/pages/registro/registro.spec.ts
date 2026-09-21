import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Registro } from './registro';
import { DemoAuthService } from '../../core/services/demo-auth.service';
describe('Registro simulado',()=>{
 beforeEach(async()=>{sessionStorage.clear();await TestBed.configureTestingModule({imports:[Registro],providers:[provideRouter([])]}).compileComponents();});
 it('rechaza vacíos, celular inválido y contraseñas distintas',()=>{const c=TestBed.createComponent(Registro).componentInstance;c.submit();expect(c.step()).toBe('form');expect(c.form.invalid).toBe(true);c.fillDemo();c.form.controls.phone.setValue('123');c.submit();expect(c.step()).toBe('form');c.fillDemo();c.form.controls.confirm.setValue('Otra123!');c.submit();expect(c.form.hasError('mismatch')).toBe(true);});
 it('rechaza una cuenta distinta aunque su formato sea válido',()=>{const c=TestBed.createComponent(Registro).componentInstance;c.fillDemo();c.form.controls.email.setValue('otro@example.com');c.submit();expect(c.error()).toContain('único usuario');expect(c.step()).toBe('form');});
 it('completa formulario y verificación, rechazando antes un código erróneo',async()=>{const f=TestBed.createComponent(Registro);const c=f.componentInstance;c.fillDemo();c.submit();expect(c.step()).toBe('verify');c.verification.setValue('000000');c.verify();expect(c.step()).toBe('verify');c.verification.setValue('123456');c.verify();await f.whenStable();expect(c.step()).toBe('done');expect(f.nativeElement.textContent).toContain('Registro de prueba completado');expect(TestBed.inject(DemoAuthService).stateView().profile.name).toBe('Anthony (prueba)');});
});
