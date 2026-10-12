"""malvitec-perfil: ver y editar los datos de la cuenta del usuario con sesión iniciada, para Mi Cuenta. Rutas en backend/README.md."""

import re

import bcrypt

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, respuesta, usuario_actual

# Mismas reglas que malvitec-auth.
COSTE_BCRYPT = 10
BYTES_MAXIMOS_CONTRASENA = 72
TELEFONO_VALIDO = re.compile(r"^9\d{8}$")
CONTRASENA_VALIDA = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")
PREFERENCIAS_DE_PAGO = ("tarjeta", "yape_plin", "contra_entrega")

# Campo de la dirección -> (nombre para el mensaje, largo máximo de la columna en direcciones).
CAMPOS_DIRECCION = {
    "departamento": ("el departamento", 40),
    "distrito": ("el distrito", 80),
    "direccion": ("la dirección", 200),
}


def texto(datos, campo):
    valor = datos.get(campo)
    return valor.strip() if isinstance(valor, str) else ""


def leer_perfil(cursor, usuario_id):
    # La columna se llama preferencia_pa en database/malvitec_sqlserver.sql.
    cursor.execute(
        """
        SELECT nombre, apellidos, correo, telefono, rol, preferencia_pa AS preferencia_pago, creado_en
        FROM usuarios
        WHERE id = %s AND activo = 1
        """,
        (usuario_id,),
    )
    perfil = cursor.fetchone()
    if not perfil:
        raise ErrorApi(404, "La cuenta no existe o está desactivada")

    # La principal primero; si no hay ninguna marcada, la más reciente.
    cursor.execute(
        """
        SELECT TOP 1 departamento, distrito, direccion, referencia
        FROM direcciones
        WHERE usuario_id = %s
        ORDER BY es_principal DESC, creado_en DESC, id DESC
        """,
        (usuario_id,),
    )
    perfil["direccion"] = cursor.fetchone()
    return perfil


def leer_datos(datos):
    """Valida los datos personales enviados y los devuelve con el nombre de su columna."""
    cambios = {}
    if "nombre" in datos:
        nombre = texto(datos, "nombre")
        if not 2 <= len(nombre) <= 100:
            raise ErrorApi(400, "Ingresa tu nombre")
        cambios["nombre"] = nombre
    if "apellidos" in datos:
        apellidos = texto(datos, "apellidos")
        if len(apellidos) > 100:
            raise ErrorApi(400, "Los apellidos no pueden tener más de 100 caracteres")
        cambios["apellidos"] = apellidos or None
    if "telefono" in datos:
        telefono = texto(datos, "telefono")
        if not TELEFONO_VALIDO.match(telefono):
            raise ErrorApi(400, "El teléfono debe tener 9 dígitos y empezar en 9")
        cambios["telefono"] = telefono
    if "preferencia_pago" in datos:
        preferencia = datos["preferencia_pago"] or None
        if preferencia is not None and preferencia not in PREFERENCIAS_DE_PAGO:
            raise ErrorApi(400, "Método de pago no válido")
        cambios["preferencia_pa"] = preferencia
    return cambios


def leer_direccion(valor):
    if not isinstance(valor, dict):
        raise ErrorApi(400, "La dirección no es válida")
    direccion = {}
    for campo, (nombre, largo) in CAMPOS_DIRECCION.items():
        dato = texto(valor, campo)
        if not dato:
            raise ErrorApi(400, f"Falta {nombre}")
        if len(dato) > largo:
            raise ErrorApi(400, f"{nombre[0].upper()}{nombre[1:]} no puede tener más de {largo} caracteres")
        direccion[campo] = dato
    referencia = texto(valor, "referencia")
    if len(referencia) > 200:
        raise ErrorApi(400, "La referencia no puede tener más de 200 caracteres")
    direccion["referencia"] = referencia or None
    return direccion


def guardar_direccion(cursor, usuario_id, direccion):
    # Se edita la misma dirección que muestra leer_perfil; si no hay ninguna, se crea como principal.
    cursor.execute(
        "SELECT TOP 1 id FROM direcciones WHERE usuario_id = %s ORDER BY es_principal DESC, creado_en DESC, id DESC",
        (usuario_id,),
    )
    actual = cursor.fetchone()
    valores = (direccion["departamento"], direccion["distrito"], direccion["direccion"], direccion["referencia"])
    if actual:
        cursor.execute(
            "UPDATE direcciones SET departamento = %s, distrito = %s, direccion = %s, referencia = %s WHERE id = %s",
            (*valores, actual["id"]),
        )
    else:
        cursor.execute(
            """
            INSERT INTO direcciones (usuario_id, departamento, distrito, direccion, referencia, es_principal)
            VALUES (%s, %s, %s, %s, %s, 1)
            """,
            (usuario_id, *valores),
        )


def cambiar_contrasena(cursor, usuario_id, datos):
    actual = datos.get("contrasena_actual")
    nueva = datos.get("contrasena_nueva")
    if not isinstance(actual, str) or not actual:
        raise ErrorApi(400, "Ingresa tu contraseña actual")
    # La contraseña no se recorta: los espacios también cuentan.
    if not isinstance(nueva, str) or not CONTRASENA_VALIDA.match(nueva):
        raise ErrorApi(400, "La contraseña nueva debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo")
    if len(nueva.encode("utf-8")) > BYTES_MAXIMOS_CONTRASENA:
        raise ErrorApi(400, "La contraseña nueva es demasiado larga")

    cursor.execute("SELECT contrasena_hash FROM usuarios WHERE id = %s AND activo = 1", (usuario_id,))
    usuario = cursor.fetchone()
    if not usuario:
        raise ErrorApi(404, "La cuenta no existe o está desactivada")
    bytes_actual = actual.encode("utf-8")
    if len(bytes_actual) > BYTES_MAXIMOS_CONTRASENA or not bcrypt.checkpw(
        bytes_actual, usuario["contrasena_hash"].encode("ascii")
    ):
        raise ErrorApi(403, "La contraseña actual no es correcta")

    nuevo_hash = bcrypt.hashpw(nueva.encode("utf-8"), bcrypt.gensalt(COSTE_BCRYPT)).decode("ascii")
    cursor.execute("UPDATE usuarios SET contrasena_hash = %s WHERE id = %s", (nuevo_hash, usuario_id))


def editar_perfil(cursor, usuario_id, datos):
    cambios = leer_datos(datos)
    direccion = leer_direccion(datos["direccion"]) if datos.get("direccion") is not None else None
    con_contrasena = "contrasena_nueva" in datos or "contrasena_actual" in datos
    if not cambios and direccion is None and not con_contrasena:
        raise ErrorApi(400, "No enviaste ningún cambio")

    # Primero la contraseña: si la actual no coincide, no se guarda nada de lo demás.
    if con_contrasena:
        cambiar_contrasena(cursor, usuario_id, datos)
    if cambios:
        # Los nombres de columna salen de leer_datos, nunca de lo que envía el front.
        asignaciones = ", ".join(f"{columna} = %s" for columna in cambios)
        cursor.execute(
            f"UPDATE usuarios SET {asignaciones} WHERE id = %s AND activo = 1", (*cambios.values(), usuario_id)
        )
    if direccion is not None:
        guardar_direccion(cursor, usuario_id, direccion)
    return leer_perfil(cursor, usuario_id)


@manejar
def lambda_handler(event, context):
    usuario_id = usuario_actual(event)["usuario_id"]
    accion = metodo(event)

    if accion == "GET":
        with conexion() as cursor:
            return respuesta(200, leer_perfil(cursor, usuario_id))

    if accion == "PUT":
        with conexion() as cursor:
            return respuesta(200, editar_perfil(cursor, usuario_id, cuerpo(event)))

    raise ErrorApi(404, "Ruta no encontrada")
