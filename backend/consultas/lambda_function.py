"""malvitec-consultas: preguntas de los clientes sobre un producto. El proveedor las responde desde malvitec-proveedor. Rutas en backend/README.md."""

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, parametro, respuesta, usuario_actual


def texto(datos, campo):
    valor = datos.get(campo)
    return valor.strip() if isinstance(valor, str) else ""


def listar(cursor, usuario_id):
    cursor.execute(
        """
        SELECT c.id, p.slug, p.titulo AS producto, pr.nombre_comercial AS proveedor,
               c.mensaje, c.respuesta, c.estado, c.creado_en, c.respondida_en
        FROM consultas c
        JOIN productos p ON p.id = c.producto_id
        JOIN proveedores pr ON pr.id = p.proveedor_id
        WHERE c.usuario_id = %s
        ORDER BY c.creado_en DESC, c.id DESC
        """,
        (usuario_id,),
    )
    return respuesta(200, cursor.fetchall())


def preguntar(cursor, usuario_id, datos):
    mensaje = texto(datos, "mensaje")
    if not mensaje:
        raise ErrorApi(400, "Falta el mensaje")
    if len(mensaje) > 500:
        raise ErrorApi(400, "El mensaje no puede tener más de 500 caracteres")

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


@manejar
def lambda_handler(event, context):
    usuario_id = usuario_actual(event, "cliente")["usuario_id"]
    accion = metodo(event)

    if parametro(event, "slug") or accion not in ("GET", "POST"):
        raise ErrorApi(404, "Ruta no encontrada")

    with conexion() as cursor:
        if accion == "GET":
            return listar(cursor, usuario_id)
        return preguntar(cursor, usuario_id, cuerpo(event))
