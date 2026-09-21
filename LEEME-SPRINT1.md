# MALVITEC — Sprint 1 de Anthony

Base: Desarrollo-web-TF-main (1).zip, recibido el 21 de septiembre de 2026.
Alcance confirmado: un usuario de prueba, sin backend y sin agente de IA. Malvino usa respuestas programadas. No se necesitan API keys, tarjetas ni servicios de pago para esta demostración local.

## Ejecutar

Descomprime MALVITEC-Sprint1-validado.zip, abre la carpeta MALVITEC-Sprint1 (contiene package.json) en VS Code y ejecuta:

```bash
npm ci
npm start
```

Abre http://localhost:4200/registro. Si tienes otra versión ejecutándose, detenla con Control+C en su terminal. Alternativamente ejecuta `npm start -- --port 4201` y abre http://localhost:4201/registro.

Probado con Node 24.3.0, npm 11.4.2 y las dependencias del package-lock.json del ZIP recibido. No se cambiaron las versiones ni se añadieron dependencias.

## Única cuenta de prueba

- Correo: demo@malvitec.com
- Contraseña: Malvitec123!
- Código simulado: 123456

La cuenta está predefinida para probar login directamente. El registro simula su activación y actualiza su perfil de prueba; no genera una lista de usuarios ni credenciales nuevas. Se pueden completar los campos con el botón “Completar datos de prueba”. No uses información real.

## Pantallas

- /registro: nombre, correo, celular, contraseña y confirmación; dirección y preferencia de pago opcionales. Validaciones de formato, contraseña segura y coincidencia. Verificación de código simulada.
- /login: credenciales fijas, mensajes de error, mostrar/ocultar contraseña, acceso al inicio y recuperación simulada. No se envían SMS/correos ni se modifica la contraseña fija.
- /malvino-chatbot (también /malvino): chat de respuestas programadas, consultas guiadas sobre accesorios, referencias exactas, alternativas de ejemplo y consultas de registro/login. No utiliza IA generativa ni APIs.
- Cerrar sesión: disponible en el menú después del ingreso. En pantalla estrecha se accede abriendo el menú.

Las fichas de compatibilidad son datos ficticios identificados como ejemplos. No afirman compatibilidad ni stock real. Una pregunta ambigua como “esta batería para Samsung A32” solicita la variante y la referencia en lugar de inventar una respuesta.

## Relación con el Word

HU-09: se demuestra el formulario, la validación, el código y la recuperación con un usuario fijo. Se guarda la dirección/preferencia opcional solo como datos de prueba en sessionStorage. HU-02: la conversación y compatibilidad se simulan mediante reglas, según la instrucción de no usar IA todavía. No se implementan compras, promociones reales, seguimiento de pedidos, autenticación de servidor ni correo/SMS. Mi cuenta conserva el contenido del equipo; el perfil de prueba del registro no reemplaza ese módulo.

## Validación realizada

- Compilación de producción: correcta con `CI=true npm run build`.
- Pruebas: `npm test -- --watch=false`, 21 pruebas correctas en 10 archivos.
- Navegador: registro → código → login → inicio; respuesta de compatibilidad; apertura/cierre del menú y cierre de sesión. También se abrió la compilación final de producción en navegador.
- El ZIP se verifica al empaquetar; no incluye node_modules ni credenciales privadas.

Se usó `CI=true` para desactivar la caché de disco de Angular durante la compilación: el módulo nativo LMDB de la caché abortaba en el entorno de validación. Si tu Mac presenta “Abort trap: 6”, ejecuta:

```bash
npm run ng -- cache disable
npm start
```

Después, `npm run build` sirve para volver a comprobar la compilación. Desactivar la caché afecta el rendimiento de las compilaciones, no las funciones de la aplicación.

## Advertencias del proyecto base

La compilación termina correctamente, pero advierte que proveedor-dashboard.css contiene texto TypeScript en lugar de CSS. Ese archivo viene así en el último ZIP y se conserva por pertenecer al módulo del proveedor. También se supera el umbral de advertencia de 500 kB del paquete inicial (aprox. 680 kB), sin superar el límite de error de 1 MB. Estas advertencias no se ocultan ni se cambian los límites para eliminarlas.

## Integración

Ver CAMBIOS-SPRINT1.md y sprint1.patch para la lista exacta y el diff. El ZIP original permanece intacto. Se conservan catálogo, carrito, favoritos, checkout, Mi cuenta y proveedor; solo hay ajustes de pruebas en Confirmacion y ProductoDetalle para proporcionar el router que requieren sus enlaces.
