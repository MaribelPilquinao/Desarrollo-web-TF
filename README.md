# Malvitec Marketplace

Tienda de tecnología hecha con Angular 21 y Bootstrap. El front usa un backend en AWS (Lambda + API Gateway + SQL Server en RDS), documentado en [`backend/README.md`](backend/README.md). El script de la base de datos está en `database/malvitec_sqlserver.sql`.

## Cómo correrlo

```bash
npm install
npm start            # http://localhost:4200
npm run build        # compila en dist/
npx ng test --watch=false   # corre las pruebas una vez
```

Usuario de prueba: `demo@malvitec.com` / `Malvitec123!`. El código de verificación de registro y recuperación es `123456`.

## Conexión con el API

| Archivo | Qué hace |
|---|---|
| `src/app/core/api.ts` | `API_URL` (la URL de API Gateway) y `mensajeDeError()`, que devuelve el mensaje del backend para mostrarlo al usuario |
| `src/app/core/token.interceptor.ts` | Agrega `Authorization: Bearer <token>` a toda petición que vaya a `API_URL`. Si el backend responde 401, cierra la sesión y lleva al login |
| `src/app/core/services/sesion.service.ts` | Login, registro y recuperación. Guarda el token y el usuario en `localStorage` (`malvitec_sesion`) y los descarta al recargar si el token venció |
| `src/app/core/services/favoritos.service.ts` | Favoritos de la cuenta. Se cargan al iniciar sesión y se vacían al cerrarla |
| `src/app/core/services/carrito.service.ts` | Carrito de la cuenta. Los montos y el costo de envío vienen del backend |

- **Sin sesión:** si alguien intenta agregar al carrito o a favoritos, el servicio lo lleva al login.
- **Valor de retorno:** `agregar`, `cambiarCantidad`, `quitar` y `vaciar` del carrito devuelven `Promise<boolean>`: `false` si no se pudo hacer (sin sesión, sin stock…).
- **Errores:** los de carrito y favoritos quedan en la señal `error` de cada servicio y se muestran como aviso debajo de la barra de navegación.

### Usar tu módulo desde el front

Crea un servicio que llame a `${API_URL}/tu-ruta` con `HttpClient`. El token se agrega solo:

```ts
private readonly http = inject(HttpClient);

listar() {
  return firstValueFrom(this.http.get<Pedido[]>(`${API_URL}/pedidos`));
}
```

> La app no usa zone.js. Si una variable que se muestra en la plantilla cambia después de un `await` o de una respuesta HTTP, declárala como `signal()`; si no, la pantalla puede no actualizarse.

### Pruebas

Las pruebas que llaman al API usan `provideHttpClient()` y `provideHttpClientTesting()`, y simulan las respuestas con `HttpTestingController`, así que no llaman a AWS. Si un componente usa `CarritoService`, `FavoritosService` o `SesionService`, su spec necesita esos dos providers.
