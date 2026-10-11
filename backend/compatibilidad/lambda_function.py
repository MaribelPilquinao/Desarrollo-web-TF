"""malvitec-compatibilidad: accesorios y modelos de celular para Malvino. Rutas públicas, en backend/README.md."""

from malvitec_comun import ErrorApi, conexion, manejar, metodo, parametro, respuesta


def listar(cursor):
    cursor.execute("SELECT slug, nombre FROM modelos_celular ORDER BY nombre")
    modelos = cursor.fetchall()

    cursor.execute(
        """
        SELECT id, slug, titulo, tipo_accesorio, precio_actual, stock, imagen_url
        FROM productos
        WHERE tipo_accesorio IS NOT NULL AND activo = 1
        ORDER BY titulo
        """
    )
    accesorios = cursor.fetchall()

    cursor.execute(
        """
        SELECT c.producto_id, m.slug
        FROM compatibilidad c
        JOIN modelos_celular m ON m.id = c.modelo_id
        ORDER BY m.nombre
        """
    )
    por_producto = {}
    for fila in cursor.fetchall():
        por_producto.setdefault(fila["producto_id"], []).append(fila["slug"])

    for accesorio in accesorios:
        accesorio["modelos"] = por_producto.get(accesorio.pop("id"), [])

    return respuesta(200, {"modelos": modelos, "accesorios": accesorios})


def comprobar(cursor, slug, slug_modelo):
    if not isinstance(slug_modelo, str) or not slug_modelo.strip():
        raise ErrorApi(400, "Falta el modelo del celular")

    cursor.execute(
        "SELECT id, slug, titulo, tipo_accesorio FROM productos WHERE slug = %s AND tipo_accesorio IS NOT NULL AND activo = 1",
        (slug,),
    )
    accesorio = cursor.fetchone()
    if not accesorio:
        raise ErrorApi(404, "El accesorio no existe")

    cursor.execute("SELECT id, slug, nombre FROM modelos_celular WHERE slug = %s", (slug_modelo.strip(),))
    modelo = cursor.fetchone()
    if not modelo:
        raise ErrorApi(404, "El modelo de celular no existe")

    accesorio_id = accesorio.pop("id")
    modelo_id = modelo.pop("id")
    cursor.execute(
        "SELECT 1 AS existe FROM compatibilidad WHERE producto_id = %s AND modelo_id = %s",
        (accesorio_id, modelo_id),
    )
    compatible = cursor.fetchone() is not None

    # Si no sirve, se sugieren accesorios del mismo tipo que sí son compatibles con ese modelo.
    alternativas = []
    if not compatible:
        cursor.execute(
            """
            SELECT p.slug, p.titulo, p.precio_actual, p.stock, p.imagen_url
            FROM productos p
            JOIN compatibilidad c ON c.producto_id = p.id
            WHERE c.modelo_id = %s AND p.tipo_accesorio = %s AND p.activo = 1
            ORDER BY p.titulo
            """,
            (modelo_id, accesorio["tipo_accesorio"]),
        )
        alternativas = cursor.fetchall()

    return respuesta(
        200,
        {"compatible": compatible, "accesorio": accesorio, "modelo": modelo, "alternativas": alternativas},
    )


@manejar
def lambda_handler(event, context):
    if metodo(event) != "GET":
        raise ErrorApi(404, "Ruta no encontrada")

    slug = parametro(event, "slug")
    with conexion() as cursor:
        if not slug:
            return listar(cursor)
        return comprobar(cursor, slug, (event.get("queryStringParameters") or {}).get("modelo"))
