import { DemoAuthService, DEMO_EMAIL, DEMO_PASSWORD } from './demo-auth.service';
describe('Usuario único de prueba',()=>{
 beforeEach(()=>sessionStorage.clear());
 it('acepta solo las credenciales fijas y conserva la sesión al recargar',()=>{const a=new DemoAuthService();expect(a.login('otro@correo.com',DEMO_PASSWORD)).toBe(false);expect(a.login(DEMO_EMAIL,'incorrecta')).toBe(false);expect(a.login(' DEMO@MALVITEC.COM ',DEMO_PASSWORD)).toBe(true);expect(new DemoAuthService().stateView().loggedIn).toBe(true);a.logout();expect(new DemoAuthService().stateView().loggedIn).toBe(false);});
 it('exige código y permite simular registro sin crear otros usuarios',()=>{const a=new DemoAuthService();const p={name:'Anthony',phone:'999888777',address:'Dirección de prueba',payment:'Yape'};expect(a.register(p,DEMO_EMAIL,DEMO_PASSWORD,'000000')).toBe(false);expect(a.register(p,'otro@example.com',DEMO_PASSWORD,'123456')).toBe(false);expect(a.register(p,DEMO_EMAIL,DEMO_PASSWORD,'123456')).toBe(true);expect(new DemoAuthService().stateView().profile.name).toBe('Anthony');expect(sessionStorage.getItem('malvitec_sprint1_demo')).not.toContain(DEMO_PASSWORD);});
 it('tolera datos de sesión dañados',()=>{sessionStorage.setItem('malvitec_sprint1_demo','{roto');expect(new DemoAuthService().stateView().loggedIn).toBe(false);});
});
