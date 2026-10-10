import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-confirmacion',
  imports: [RouterLink],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css',
})
export class Confirmacion {
  // Código que devolvió el backend al crear el pedido; llega en la URL desde el checkout.
  readonly codigo = inject(ActivatedRoute).snapshot.queryParamMap.get('codigo');
}
