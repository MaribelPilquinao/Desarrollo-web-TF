import { TestBed } from '@angular/core/testing';
import { MalvinoChatbot } from './malvino-chatbot';
describe('Chat',()=>{
 it('ignora vacíos, responde, escapa HTML y borra la conversación',async()=>{await TestBed.configureTestingModule({imports:[MalvinoChatbot]}).compileComponents();const f=TestBed.createComponent(MalvinoChatbot);const c=f.componentInstance;c.send(' ');expect(c.messages().length).toBe(1);c.send('<img src=x onerror=alert(1)>');await f.whenStable();expect(c.messages().length).toBe(3);expect(f.nativeElement.querySelector('.messages img')).toBeNull();c.clear();expect(c.messages().length).toBe(1);});
});
