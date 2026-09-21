import { Injectable, signal } from '@angular/core';
export const DEMO_EMAIL = 'demo@malvitec.com';
export const DEMO_PASSWORD = 'Malvitec123!';
export const DEMO_CODE = '123456';
export interface DemoProfile { name: string; phone: string; address: string; payment: string; }
const DEFAULT_PROFILE: DemoProfile = {name:'Usuario de prueba',phone:'999888777',address:'',payment:''};
@Injectable({providedIn:'root'})
export class DemoAuthService {
  private readonly key = 'malvitec_sprint1_demo';
  private readonly state = signal(this.restore());
  readonly stateView = this.state.asReadonly();
  private restore(): {loggedIn:boolean; profile:DemoProfile} {
    try {
      const value = JSON.parse(sessionStorage.getItem(this.key) || 'null');
      if(value && typeof value.loggedIn === 'boolean' && value.profile && ['name','phone','address','payment'].every(k => typeof value.profile[k] === 'string')) return value;
    } catch { /* Funciona en memoria si el navegador bloquea el almacenamiento. */ }
    return {loggedIn:false,profile:{...DEFAULT_PROFILE}};
  }
  private save(): void { try {sessionStorage.setItem(this.key,JSON.stringify(this.state()));} catch { /* Sesión solo en memoria. */ } }
  login(email:string,password:string): boolean {
    if(email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) return false;
    this.state.update(s=>({...s,loggedIn:true}));this.save();return true;
  }
  register(profile:DemoProfile, email:string,password:string,code:string): boolean {
    if(email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD || code !== DEMO_CODE || profile.name.trim().length<2 || !/^9\d{8}$/.test(profile.phone)) return false;
    this.state.set({loggedIn:false,profile:{...profile,name:profile.name.trim(),address:profile.address.trim()}});this.save();return true;
  }
  logout(): void {this.state.update(s=>({...s,loggedIn:false}));this.save();}
}
