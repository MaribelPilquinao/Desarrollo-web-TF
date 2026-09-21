import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DemoAuthService, DEMO_EMAIL, DEMO_PASSWORD, DEMO_CODE } from '../../core/services/demo-auth.service';
@Component({selector:'app-login',imports:[ReactiveFormsModule,RouterLink],templateUrl:'./login.html',styleUrl:'../acceso.css'})
export class Login {
  readonly auth = inject(DemoAuthService); private readonly router = inject(Router);
  readonly email = DEMO_EMAIL; readonly password = DEMO_PASSWORD; readonly code = DEMO_CODE;
  readonly visible = signal(false); readonly error = signal(''); readonly recovery = signal(false); readonly recovered = signal(false);
  readonly form = new FormGroup({email:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.email]}),password:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.minLength(8)]})});
  readonly recoveryForm = new FormGroup({email:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.email]}),code:new FormControl('',{nonNullable:true,validators:[Validators.required]})});
  submit(): void {
    this.error.set('');this.form.controls.email.setValue(this.form.controls.email.value.trim());this.form.markAllAsTouched();
    if(this.form.invalid) return;
    const {email,password}=this.form.getRawValue();
    if(!this.auth.login(email,password)){this.error.set('Correo o contraseña incorrectos. Utiliza la cuenta de prueba indicada.');return;}
    this.form.controls.password.reset();void this.router.navigate(['/home']);
  }
  recover(): void {
    this.recovered.set(false);this.recoveryForm.markAllAsTouched();
    const value=this.recoveryForm.getRawValue();
    if(value.email.trim().toLowerCase()===DEMO_EMAIL && value.code===DEMO_CODE) this.recovered.set(true);
  }
}
