# Backend de Malvitec

Funciones AWS Lambda en Python 3.13, detrás de un API REST de API Gateway, con SQL Server en Amazon RDS. Hay una Lambda por módulo y todas comparten el código de `capa/`, que se sube como una Layer.

```
Angular ──HTTPS──▶ API Gateway ──▶ Lambda (una por módulo) ──▶ SQL Server (RDS)
                                    └─ Layer: malvitec_comun + pymssql, PyJWT, bcrypt
```

URL del API (etapa `v1`): `https://y1fqqcqake.execute-api.us-east-1.amazonaws.com/v1`

## Estructura

| Carpeta / archivo | Contenido |
|---|---|
| `capa/python/malvitec_comun/` | Código compartido: conexión, token y formato de respuestas |
| `auth/`, `favoritos/`, `carrito/`, `pedidos/`, `perfil/` | Una Lambda por carpeta, cada una con su `lambda_function.py` |
| `empaquetar.py` | Genera los `.zip` para subir a AWS |
| `servidor_local.py` | Simula API Gateway en tu PC |
| `.env.ejemplo` | Plantilla de variables de entorno para trabajar en local |
| `requirements.txt` | Librerías de la Layer |

## Rutas

Las rutas marcadas con 🔒 piden el encabezado `Authorization: Bearer <token>`.

### `malvitec-auth` (tabla `usuarios`)

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/auth/registro` | `nombre`, `correo`, `telefono`, `contrasena`, `codigo`, `preferencia_pago` (opcional) | 201 con `id`, `nombre`, `correo` |
| POST | `/auth/login` | `correo`, `contrasena` | `token` y `usuario` |
| POST | `/auth/recuperar` | `correo`, `codigo`, `nueva_contrasena` | `mensaje` |

- El registro siempre crea usuarios con rol `cliente`. Los proveedores se crean desde la base.
- El código de verificación es fijo: `123456`. No se envían correos ni SMS.
- Contraseña: mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo. Teléfono: 9 dígitos y empieza en 9.
- `preferencia_pago` acepta `yape`, `plin`, `tarjeta` o `contra entrega`. Yape y Plin se guardan como `yape_plin`.

### `malvitec-favoritos` (tabla `favoritos`) 🔒

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/favoritos` | — | Lista de `slug`, `titulo`, `precio_actual`, `imagen_url` |
| POST | `/favoritos` | `slug` | 201 con el producto (200 si ya estaba) |
| DELETE | `/favoritos/{slug}` | — | `mensaje` |

### `malvitec-carrito` (tabla `carrito_items`) 🔒

| Método | Ruta | Cuerpo |
|---|---|---|
| GET | `/carrito` | — |
| POST | `/carrito` | `slug`, `cantidad` (opcional, por defecto 1). Si el producto ya está, suma la cantidad |
| PUT | `/carrito/{slug}` | `cantidad` |
| DELETE | `/carrito/{slug}` | — |
| DELETE | `/carrito` | — (vacía el carrito) |

Todas devuelven el carrito actualizado: `items` (`slug`, `titulo`, `imagen_url`, `precio_actual`, `cantidad`, `stock`), `subtotal`, `costo_envio` y `total`. El envío es gratis desde S/ 50; si no, cuesta S/ 15. Un producto admite como máximo 99 unidades, y nunca más que su stock.

### `malvitec-pedidos` (tablas `pedidos` y `pedido_items`) 🔒

| Método | Ruta | Cuerpo |
|---|---|---|
| POST | `/pedidos` | `nombres`, `apellidos`, `correo`, `telefono`, `departamento`, `distrito`, `direccion`, `referencia` (opcional), `metodo_pago` (`tarjeta`, `yape_plin` o `contra_entrega`), `clave` (opcional) |

Crea el pedido con lo que hay en el carrito del usuario y responde `201` con `id`, `codi`, `subtotal`, `costo_envio` y `total`. En la misma transacción descuenta el stock de cada producto y vacía el carrito. Si se repite la `clave` (doble clic o reintento), devuelve el pedido ya creado con `200` en vez de duplicarlo.

### `malvitec-perfil` (tablas `usuarios` y `direcciones`) 🔒

| Método | Ruta | Cuerpo |
|---|---|---|
| GET | `/perfil` | — |

Devuelve los datos de la cuenta para Mi Cuenta: `nombre`, `apellidos`, `correo`, `telefono`, `rol`, `preferencia_pago`, `creado_en` y `direccion` (`departamento`, `distrito`, `direccion`, `referencia`). La dirección es la marcada como principal o, si no hay, la más reciente; es `null` si el usuario no tiene ninguna.

### Errores

Todas las Lambdas responden los errores como `{"error": "mensaje"}`, y el front muestra ese mensaje tal cual.

| Código | Cuándo |
|---|---|
| 400 | Datos mal enviados |
| 401 | Sin token, o token vencido (dura 8 horas) |
| 403 | El rol no tiene permiso, o la cuenta está desactivada |
| 404 | La ruta o el producto no existe |
| 409 | Conflicto: correo repetido, sin stock, más de 99 unidades |
| 500 | Error inesperado; el detalle queda en CloudWatch |

## La capa `malvitec_comun`

```python
from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, parametro, respuesta, usuario_actual
```

| Función | Para qué sirve |
|---|---|
| `@manejar` | Decora el `lambda_handler`: responde el `OPTIONS` de CORS y convierte los errores en JSON |
| `metodo(event)` | `GET`, `POST`, etc. Funciona con API REST (v1) y HTTP (v2) |
| `parametro(event, "slug")` | Parámetro de la ruta, como el `{slug}` de `/carrito/{slug}` |
| `cuerpo(event)` | Cuerpo JSON como diccionario (`{}` si viene vacío) |
| `usuario_actual(event, rol=None)` | `usuario_id` y `rol` del token. Lanza 401 sin sesión y 403 si se pide un rol que no coincide |
| `crear_token(usuario_id, rol)` | Firma el token; solo lo usa auth |
| `respuesta(codigo, datos)` | Arma la respuesta con los encabezados de CORS |
| `raise ErrorApi(codigo, "mensaje")` | Corta la ejecución y responde ese error |
| `with conexion() as cursor:` | Cursor con filas como diccionario. Confirma los cambios al salir y los deshace si hubo un error |

Escribe siempre las consultas con `%s` y los valores aparte. No armes el SQL pegando textos:

```python
cursor.execute("SELECT id FROM productos WHERE slug = %s", (slug,))
```

## Crear una Lambda nueva

1. Crea `backend/<modulo>/lambda_function.py`, por ejemplo `backend/pedidos/lambda_function.py`:

   ```python
   from malvitec_comun import ErrorApi, conexion, manejar, metodo, respuesta, usuario_actual


   @manejar
   def lambda_handler(event, context):
       usuario = usuario_actual(event)  # quítalo si la ruta es pública

       if metodo(event) == "GET":
           with conexion() as cursor:
               cursor.execute(
                   "SELECT id, codi, total FROM pedidos WHERE usuario_id = %s",
                   (usuario["usuario_id"],),
               )
               return respuesta(200, cursor.fetchall())

       raise ErrorApi(404, "Ruta no encontrada")
   ```

2. Agrega la carpeta a `LAMBDAS` en `servidor_local.py` si quieres probarla en local.
3. Corre `python backend/empaquetar.py`. Genera `dist/malvitec-<modulo>.zip`.

## Probar en local

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.ejemplo .env             # y completa tus datos
python servidor_local.py           # API en http://localhost:3000
python servidor_local.py token 1   # imprime un token de prueba del usuario 1
```

- SQL Server debe tener TCP/IP activado en el puerto 1433.
- Para que el front use el servidor local, cambia `API_URL` en `src/app/core/api.ts` a `http://localhost:3000`, sin `/v1`. Vuelve a la URL de AWS antes de hacer commit.

## Desplegar en AWS

1. `python backend/empaquetar.py` genera en `backend/dist/` la Layer (`capa-malvitec.zip`) y un zip por Lambda.
2. **Layer:** si cambió algo en `capa/` o en `requirements.txt`, sube una versión nueva de `capa-malvitec.zip` y actualiza la versión en cada Lambda.
3. **Lambda:** usa runtime *Python 3.13* y arquitectura *x86_64*, que deben coincidir con la Layer. Agrega la Layer, sube el zip y pon el tiempo de espera en **15 s** (los 3 s por defecto no alcanzan para conectarse a la base).
4. **Variables de entorno** de cada Lambda:

   | Variable | Obligatoria | Nota |
   |---|---|---|
   | `BD_SERVIDOR` | Sí | Endpoint de RDS |
   | `BD_USUARIO`, `BD_CONTRASENA` | Sí en AWS | Si se dejan vacías, se entra con la cuenta de Windows (solo sirve en local) |
   | `JWT_SECRETO` | Sí | **Debe ser igual en todas las Lambdas.** Pídelo por privado; no va en el repositorio |
   | `BD_PUERTO`, `BD_NOMBRE` | No | Por defecto `1433` y `malvitec` |
   | `CORS_ORIGEN` | No | Por defecto `*` |

5. **API Gateway:** crea los recursos y métodos con **integración de proxy de Lambda** activada, y activa CORS en cada recurso. Los parámetros de ruta se llaman `{slug}`.
6. **Implementa la API** en la etapa `v1`. Sin este paso, los cambios no quedan publicados.

### Problemas que ya nos pasaron

| Síntoma | Causa |
|---|---|
| `Missing Authentication Token` | La ruta o el método no existen: se envió GET en vez de POST, o falta implementar la API |
| Respuesta envuelta en `{"statusCode": ..., "body": ...}`, o 401 aunque envíes el token | El método se creó sin integración de proxy de Lambda |
| `502` y `Status: timeout` a los 3 s en CloudWatch | El tiempo de espera de la Lambda sigue en 3 s |
| `Adaptive Server connection timed out` a los 10 s | La consulta quedó bloqueada; revisa transacciones sin confirmar (DBeaver en modo manual) |
