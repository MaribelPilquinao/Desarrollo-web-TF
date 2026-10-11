"""malvitec-consultas: preguntas de los clientes sobre un producto y respuestas del proveedor. Rutas en backend/README.md."""

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, parametro, respuesta, usuario_actual

# El cliente ve las consultas que hizo; el proveedor, las de sus productos.
FILTRO_POR_ROL = {
    "cliente": "c.usuario_id = %s",
    "proveedor": "pr.usuario_id = %s",
}


def texto(datos, campo):
    valor = datos.get(campo)
    return valor.strip() if isinstance(valor, str) else ""


def leer_mensaje(datos, campo, nombre):
    mensaje = texto(datos, campo)
    if not mensaje:
        raise ErrorApi(400, f"Falta {nombre}")
    if len(mensaje) > 500:
        raise ErrorApi(400, f"{nombre[0].upper()}{nombre[1:]} no puede tener más de 500 caracteres")
    return mensaje


def listar(cursor, usuario):
    filtro = FILTRO_POR_ROL.get(usuario["rol"])
    if not filtro:
        raise ErrorApi(403, "No tienes permiso para ver consultas")

    cursor.execute(
        f"""
        SELECT c.id, CONCAT(u.nombre, ' ' + u.apellidos) AS cliente, p.slug, p.titulo AS producto,
               c.mensaje, c.respuesta, c.estado, c.creado_en, c.respondida_en
        FROM consultas c
        JOIN productos p ON p.id = c.producto_id
        JOIN proveedores pr ON pr.id = p.proveedor_id
        JOIN usuarios u ON u.id = c.usuario_id
        WHERE {filtro}
        ORDER BY c.creado_en DESC, c.id DESC
        """,
        (usuario["usuario_id"],),
    )
    return respuesta(200, cursor.fetchall())


def preguntar(cursor, usuario_id, datos):
    mensaje = leer_mensaje(datos, "mensaje", "el mensaje")
    cursor.execute("SELECT id FROM productos WHERE slug = %s AND activo = 1", (texto(datos, "slug"),))
    producto = cursor.fetchone()
    if not producto:
        raise ErrorApi(404, "El producto no existe")

    cursor.execute(
        """
        INSERT INTO consultas (producto_id, usuario_id, mensaje)
        OUTPUT INSERTED.id, INSERTED.mensaje, INSERTED.estado, INSERTED.creado_en
        VALUES (%s, %s, %s)
        """,
        (producto["id"], usuario_id, mensaje),
    )
    return respuesta(201, cursor.fetchone())


def responder(cursor, usuario_id, consulta_id, datos):
    texto_respuesta = leer_mensaje(datos, "respuesta", "la respuesta")
    try:
        consulta_id = int(consulta_id)
    except (TypeError, ValueError):
        raise ErrorApi(400, "Id de consulta no válido")

    # Solo responde el proveedor dueño del producto consultado.
    cursor.execute(
        """
        SELECT c.id
        FROM consultas c
        JOIN productos p ON p.id = c.producto_id
        JOIN proveedores pr ON pr.id = p.proveedor_id
        WHERE c.id = %s AND pr.usuario_id = %s
        """,
        (consulta_id, usuario_id),
    )
    if not cursor.fetchone():
        raise ErrorApi(404, "La consulta no existe")

    cursor.execute(
        """
        UPDATE consultas
        SET respuesta = %s, estado = 'Respondida', respondida_en = SYSDATETIME()
        OUTPUT INSERTED.id, INSERTED.respuesta, INSERTED.estado, INSERTED.respondida_en
        WHERE id = %s
        """,
        (texto_respuesta, consulta_id),
    )
    return respuesta(200, cursor.fetchone())


@manejar
def lambda_handler(event, context):
    accion = metodo(event)
    # En API Gateway el parámetro de la ruta se llama {slug}, igual que en las demás Lambdas.
    consulta_id = parametro(event, "id") or parametro(event, "slug")

    if accion == "GET" and not consulta_id:
        usuario = usuario_actual(event)
        with conexion() as cursor:
            return listar(cursor, usuario)

    if accion == "POST" and not consulta_id:
        usuario = usuario_actual(event, "cliente")
        with conexion() as cursor:
            return preguntar(cursor, usuario["usuario_id"], cuerpo(event))

    if accion == "PUT" and consulta_id:
        usuario = usuario_actual(event, "proveedor")
        with conexion() as cursor:
            return responder(cursor, usuario["usuario_id"], consulta_id, cuerpo(event))

    raise ErrorApi(404, "Ruta no encontrada")
