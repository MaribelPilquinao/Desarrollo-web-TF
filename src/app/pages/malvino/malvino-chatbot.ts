import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MalvinoService, MensajeChat, ProductoRecomendado } from '../../core/services/malvino.service';
import { CarritoService } from '../../core/services/carrito.service';

@Component({
  selector: 'app-malvino-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './malvino-chatbot.html',
  styleUrls: ['./malvino-chatbot.css']
})
export class MalvinoChatbotComponent implements OnInit {
  mensajes: MensajeChat[] = [];
  mensajeActual: string = '';
  cargando: boolean = false;

  constructor(
    private malvinoService: MalvinoService,
    private carritoService: CarritoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.mensajes.push({
      remitente: 'malvino',
      texto: '¡Hola! Soy Malvino, tu asistente en hardware. ¿Qué componentes estás buscando o necesitas consultar?',
      hora: this.obtenerHoraActual()
    });
  }

  enviar(): void {
    if (!this.mensajeActual.trim() || this.cargando) return;

    const texto = this.mensajeActual.trim();
    this.mensajes.push({
      remitente: 'usuario',
      texto,
      hora: this.obtenerHoraActual()
    });
    this.mensajeActual = '';
    this.cargando = true;

    this.malvinoService.enviarMensaje(texto).subscribe({
      next: (res) => {
        this.mensajes.push({
          remitente: 'malvino',
          texto: res.respuesta,
          hora: this.obtenerHoraActual(),
          productos: res.productos
        });
        this.cargando = false;
      },
      error: () => {
        this.mensajes.push({
          remitente: 'malvino',
          texto: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.',
          hora: this.obtenerHoraActual()
        });
        this.cargando = false;
      }
    });
  }

  verProducto(id: number): void {
    this.router.navigate(['/producto', id]);
  }

  agregarAlCarrito(prod: ProductoRecomendado): void {
    this.carritoService.agregarProducto({
      id_producto: prod.id,
      nombre: prod.nombre,
      precio: prod.precio,
      imagen_url: prod.imagen_url,
      cantidad: 1
    } as any);
  }

  private obtenerHoraActual(): string {
    const ahora = new Date();
    return ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}