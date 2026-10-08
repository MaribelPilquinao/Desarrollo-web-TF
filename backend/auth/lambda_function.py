"""malvitec-auth: registro, inicio de sesión y recuperación de contraseña. Rutas en backend/README.md."""

import re

import bcrypt

from malvitec_comun import ErrorApi, conexion, crear_token, cuerpo, manejar, metodo, respuesta

# Código fijo que ya usa el front en registro y recuperación; no se envían correos ni SMS.
CODIGO_VERIFICACION = "123456"
COSTE_BCRYPT = 10
# bcrypt solo toma en cuenta los primeros 72 bytes de la contraseña.
BYTES_MAXIMOS_CONTRASENA = 72

CORREO_VALIDO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TELEFONO_VALIDO = re.compile(r"^9\d{8}$")
CONTRASENA_VALIDA = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")

# El front ofrece Yape, Plin, Tarjeta y Contra entrega; Yape y Plin se guardan juntos.
PREFERENCIAS_DE_PAGO = {
    "yape": "yape_plin",
    "plin": "yape_plin",
    "yape_plin": "yape_plin",
    "tarjeta": "tarjeta",
    "contra entrega": "contra_entrega",
    "contra_entrega": "contra_entrega",
}


def texto(datos, campo):
    valor = datos.get(campo)
    return valor.strip() if isinstance(valor, str) else ""


def leer_correo(datos):
    correo = texto(datos, "correo").lower()
    if not CORREO_VALIDO.match(correo) or len(correo) > 150:
        raise ErrorApi(400, "Ingresa un correo válido")
    return correo


def leer_contrasena_nueva(datos, campo):
    # La contraseña no se recorta: los espacios también cuentan.
    contrasena = datos.get(campo)
    if not isinstance(contrasena, str) or not CONTRASENA_VALIDA.match(contrasena):
        raise ErrorApi(400, "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo")
    if len(contrasena.encode("utf-8")) > BYTES_MAXIMOS_CONTRASENA:
        raise ErrorApi(400, "La contraseña es demasiado larga")
    return contrasena


def validar_codigo(datos):
    if texto(datos, "codigo") != CODIGO_VERIFICACION:
        raise ErrorApi(400, "Código de verificación incorrecto")


def cifrar(contrasena):
    return bcrypt.hashpw(contrasena.encode("utf-8"), bcrypt.gensalt(COSTE_BCRYPT)).decode("ascii")


def coincide(contrasena, contrasena_hash):
    datos = contrasena.encode("utf-8")
    if len(datos) > BYTES_MAXIMOS_CONTRASENA:
        return False
    return bcrypt.checkpw(datos, contrasena_hash.encode("ascii"))


def registrar(cursor, datos):
    nombre = texto(datos, "nombre")
    if not 2 <= len(nombre) <= 100:
        raise ErrorApi(400, "Ingresa tu nombre")
    correo = leer_correo(datos)
    telefono = texto(datos, "telefono")
    if not TELEFONO_VALIDO.match(telefono):
        raise ErrorApi(400, "El teléfono debe tener 9 dígitos y empezar en 9")
    contrasena = leer_contrasena_nueva(datos, "contrasena")
    validar_codigo(datos)

    preferencia = None
    if texto(datos, "preferencia_pago"):
        preferencia = PREFERENCIAS_DE_PAGO.get(texto(datos, "preferencia_pago").lower())
        if not preferencia:
            raise ErrorApi(400, "Método de pago no válido")

    cursor.execute("SELECT 1 AS existe FROM usuarios WHERE correo = %s", (correo,))
    if cursor.fetchone():
        raise ErrorApi(409, "Ya existe una cuenta con ese correo")

    # El registro siempre crea clientes; los proveedores se crean desde la base.
    # La columna se llama preferencia_pa en database/malvitec_sqlserver.sql.
    cursor.execute(
        """
        INSERT INTO usuarios (nombre, correo, telefono, contrasena_hash, rol, preferencia_pa)
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.correo
        VALUES (%s, %s, %s, %s, 'cliente', %s)
        """,
        (nombre, correo, telefono, cifrar(contrasena), preferencia),
    )
    return respuesta(201, cursor.fetchone())


def iniciar_sesion(cursor, datos):
    correo = texto(datos, "correo").lower()
    contrasena = datos.get("contrasena")
    if not correo or not isinstance(contrasena, str) or not contrasena:
        raise ErrorApi(400, "Ingresa tu correo y tu contraseña")

    cursor.execute(
        "SELECT id, nombre, apellidos, correo, rol, activo, contrasena_hash FROM usuarios WHERE correo = %s",
        (correo,),
    )
    usuario = cursor.fetchone()
    # Un solo mensaje para los dos casos: no se revela si el correo existe.
    if not usuario or not coincide(contrasena, usuario.pop("contrasena_hash")):
        raise ErrorApi(401, "Correo o contraseña incorrectos")
    if not usuario.pop("activo"):
        raise ErrorApi(403, "Tu cuenta está desactivada")

    return respuesta(200, {"token": crear_token(usuario["id"], usuario["rol"]), "usuario": usuario})


def recuperar(cursor, datos):
    correo = leer_correo(datos)
    validar_codigo(datos)
    contrasena = leer_contrasena_nueva(datos, "nueva_contrasena")

    cursor.execute("UPDATE usuarios SET contrasena_hash = %s WHERE correo = %s", (cifrar(contrasena), correo))
    if cursor.rowcount == 0:
        raise ErrorApi(404, "No existe una cuenta con ese correo")
    return respuesta(200, {"mensaje": "Contraseña actualizada. Ya puedes iniciar sesión"})


RUTAS = {
    "registro": registrar,
    "login": iniciar_sesion,
    "recuperar": recuperar,
}


@manejar
def lambda_handler(event, context):
    # Se toma el último tramo de la ruta: sirve igual si API Gateway antepone el nombre de la etapa.
    camino = event.get("rawPath") or event.get("path") or ""
    accion = RUTAS.get(camino.rstrip("/").rsplit("/", 1)[-1])
    if not accion or metodo(event) != "POST":
        raise ErrorApi(404, "Ruta no encontrada")

    datos = cuerpo(event)
    with conexion() as cursor:
        return accion(cursor, datos)
