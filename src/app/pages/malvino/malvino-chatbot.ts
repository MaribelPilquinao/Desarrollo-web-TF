import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DEMO_ACCESSORIES, DEMO_MODELS, MalvinoService } from '../../core/services/malvino.service';
@Component({selector:'app-malvino',imports:[FormsModule],templateUrl:'./malvino-chatbot.html',styleUrl:'./malvino-chatbot.css'})
export class MalvinoChatbot {
  private readonly service=inject(MalvinoService);
  @ViewChild('history') history?:ElementRef<HTMLElement>;
  readonly accessories=DEMO_ACCESSORIES;readonly models=DEMO_MODELS;
  accessory='case-13';model='iphone 13';text='';
  readonly messages=signal([{role:'assistant',text:'¡Hola! Soy Malvino. Consulta el acceso de prueba o explora la compatibilidad usando nuestras fichas de ejemplo.'}]);
  private append(question:string,answer:string):void {this.messages.update(m=>[...m.slice(-38),{role:'user',text:question},{role:'assistant',text:answer}]);setTimeout(()=>{const e=this.history?.nativeElement;if(e)e.scrollTop=e.scrollHeight;});}
  send(value=this.text):void {const q=value.trim().slice(0,500);if(!q)return;this.append(q,this.service.answer(q));this.text='';}
  check():void {this.append(`Comprobar ${this.accessories.find(a=>a.id===this.accessory)?.name} con ${this.model}`,this.service.check(this.accessory,this.model));}
  clear():void {this.messages.set([{role:'assistant',text:'Conversación borrada. ¿En qué puedo ayudarte?'}]);}
}
