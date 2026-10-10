"""malvitec-perfil: datos de la cuenta del usuario con sesión iniciada, para Mi Cuenta. Rutas en backend/README.md."""

from malvitec_comun import ErrorApi, conexion, manejar, metodo, respuesta, usuario_actual


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


@manejar
def lambda_handler(event, context):
    usuario_id = usuario_actual(event)["usuario_id"]

    if metodo(event) != "GET":
        raise ErrorApi(404, "Ruta no encontrada")

    with conexion() as cursor:
        return respuesta(200, leer_perfil(cursor, usuario_id))
