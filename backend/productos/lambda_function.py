"""malvitec-productos: catálogo, búsqueda, detalle y productos del proveedor."""

import re
import unicodedata
from decimal import Decimal, InvalidOperation

from malvitec_comun import (
    ErrorApi,
    conexion,
    cuerpo,
    manejar,
    metodo,
    parametro,
    respuesta,
    usuario_actual,
)

TIPOS_ENVIO = ("gratis", "estandar")
TIPOS_ACCESORIO = ("case", "protector", "bateria", "cargador")


def parametro_consulta(event, nombre):
    """
    Obtiene un parámetro de consulta.

    Ejemplo:
    /productos?buscar=iphone&orden=precio_asc
    """
    parametros = event.get("queryStringParameters") or {}
    valor = parametros.get(nombre)

    if not isinstance(valor, str):
        return None

    valor = valor.strip()

    return valor if valor else None


def escapar_like(texto):
    """
    Quita el efecto de comodín a los caracteres especiales de LIKE.

    Así, buscar "100%" encuentra ese texto y no cualquier producto.
    """
    return (
        texto
        .replace("[", "[[]")
        .replace("%", "[%]")
        .replace("_", "[_]")
    )


def listar_productos(cursor, event, usuario_id=None):
    """
    Lista los productos activos.

    Permite:
    ?buscar=texto
    ?categoria=laptops
    ?orden=precio_asc
    ?orden=precio_desc
    ?orden=valoracion
    ?orden=relevancia

    Con usuario_id, solo los productos de ese proveedor.
    """

    buscar = parametro_consulta(event, "buscar")
    categoria = parametro_consulta(event, "categoria")
    orden = parametro_consulta(event, "orden") or "relevancia"

    ordenes_validos = {
        "precio_asc",
        "precio_desc",
        "valoracion",
        "relevancia",
    }

    if orden not in ordenes_validos:
        raise ErrorApi(
            400,
            "Orden no válido"
        )

    sql = """
        SELECT
            p.id,
            p.slug,
            p.titulo,
            p.descripcion,
            p.precio_actual,
            p.precio_anterior,
            p.descuento_pct,
            p.stock,
            p.imagen_url,
            p.tipo_envio,
            p.garantia_meses,
            p.calificacion_prom,
            p.num_opiniones,
            p.tipo_accesorio,
            pr.nombre_comercial AS proveedor,
            c.nombre AS categoria
        FROM productos p

        LEFT JOIN proveedores pr
            ON pr.id = p.proveedor_id

        LEFT JOIN categorias c
            ON c.id = p.categoria_id

        WHERE p.activo = 1
    """

    parametros = []

    # Categoría
    if categoria:
        sql += """
            AND c.slug = %s
        """

        parametros.append(categoria)

    # Productos del proveedor
    if usuario_id:
        sql += """
            AND pr.usuario_id = %s
        """

        parametros.append(usuario_id)

    # Búsqueda
    if buscar:
        texto = f"%{escapar_like(buscar)}%"

        sql += """
            AND (
                p.titulo LIKE %s
                OR p.descripcion LIKE %s
                OR pr.nombre_comercial LIKE %s
            )
        """

        parametros.extend([
            texto,
            texto,
            texto,
        ])

    # Ordenamiento
    if orden == "precio_asc":

        sql += """
            ORDER BY p.precio_actual ASC, p.titulo ASC
        """

    elif orden == "precio_desc":

        sql += """
            ORDER BY p.precio_actual DESC, p.titulo ASC
        """

    elif orden == "valoracion":

        sql += """
            ORDER BY
                p.calificacion_prom DESC,
                p.num_opiniones DESC,
                p.titulo ASC
        """

    elif buscar:
        # Relevancia:
        # 1. título exactamente igual
        # 2. título que comienza con la búsqueda
        # 3. proveedor relacionado
        # 4. resto de coincidencias

        sql += """
            ORDER BY
                CASE
                    WHEN p.titulo = %s THEN 0
                    WHEN p.titulo LIKE %s THEN 1
                    WHEN pr.nombre_comercial LIKE %s THEN 2
                    ELSE 3
                END,
                p.calificacion_prom DESC,
                p.titulo ASC
        """

        parametros.extend([
            buscar,
            f"{escapar_like(buscar)}%",
            f"%{escapar_like(buscar)}%",
        ])

    else:

        sql += """
            ORDER BY p.titulo ASC
        """

    cursor.execute(
        sql,
        tuple(parametros)
    )

    return cursor.fetchall()


def obtener_producto(cursor, slug):
    """Obtiene el detalle de un producto mediante su slug."""

    if not isinstance(slug, str) or not slug.strip():
        raise ErrorApi(
            400,
            "Falta el slug del producto"
        )

    cursor.execute(
        """
        SELECT
            p.id,
            p.slug,
            p.titulo,
            p.descripcion,
            p.precio_actual,
            p.precio_anterior,
            p.descuento_pct,
            p.stock,
            p.imagen_url,
            p.tipo_envio,
            p.garantia_meses,
            p.calificacion_prom,
            p.num_opiniones,
            p.tipo_accesorio,
            pr.nombre_comercial AS proveedor,
            c.nombre AS categoria
        FROM productos p

        LEFT JOIN proveedores pr
            ON pr.id = p.proveedor_id

        LEFT JOIN categorias c
            ON c.id = p.categoria_id

        WHERE p.slug = %s
          AND p.activo = 1
        """,
        (slug.strip(),),
    )

    producto = cursor.fetchone()

    if not producto:
        raise ErrorApi(
            404,
            "El producto no existe"
        )

    producto["imagenes"] = obtener_imagenes(
        cursor,
        producto["id"]
    )

    producto["especificaciones"] = obtener_especificaciones(
        cursor,
        producto["id"]
    )

    return producto


def obtener_imagenes(cursor, producto_id):
    """Obtiene la galería de imágenes del producto."""

    cursor.execute(
        """
        SELECT
            url,
            orden
        FROM producto_imagenes
        WHERE producto_id = %s
        ORDER BY orden, id
        """,
        (producto_id,),
    )

    return cursor.fetchall()


def obtener_especificaciones(cursor, producto_id):
    """Obtiene las especificaciones técnicas del producto."""

    cursor.execute(
        """
        SELECT
            clave,
            valor,
            orden
        FROM producto_especificaciones
        WHERE producto_id = %s
        ORDER BY orden, id
        """,
        (producto_id,),
    )

    return cursor.fetchall()


def texto(datos, campo):
    valor = datos.get(campo)
    return valor.strip() if isinstance(valor, str) else ""


def numero(datos, campo, nombre, minimo, maximo, entero=False):
    """Lee un número del cuerpo y comprueba que esté dentro del rango."""
    valor = datos.get(campo)

    try:
        if isinstance(valor, bool) or valor is None:
            raise InvalidOperation
        valor = Decimal(str(valor).strip())
    except InvalidOperation:
        raise ErrorApi(
            400,
            f"{nombre} debe ser un número"
        )

    if not valor.is_finite() or (entero and valor != valor.to_integral_value()):
        raise ErrorApi(
            400,
            f"{nombre} no es válido"
        )

    if not minimo <= valor <= maximo:
        raise ErrorApi(
            400,
            f"{nombre} debe estar entre {minimo} y {maximo}"
        )

    return int(valor) if entero else valor


def leer_producto(cursor, datos, completo):
    """
    Valida los campos enviados y los devuelve con el nombre de su columna.

    Con completo=True exige los obligatorios (al crear).
    Al editar solo se revisan los campos que llegaron.
    """
    campos = {}

    if completo or "titulo" in datos:
        titulo = texto(datos, "titulo")

        if not titulo:
            raise ErrorApi(400, "Falta el título")

        if len(titulo) > 200:
            raise ErrorApi(400, "El título no puede tener más de 200 caracteres")

        campos["titulo"] = titulo

    if "descripcion" in datos:
        campos["descripcion"] = texto(datos, "descripcion") or None

    if completo or "categoria" in datos:
        cursor.execute(
            "SELECT id FROM categorias WHERE slug = %s",
            (texto(datos, "categoria"),),
        )

        categoria = cursor.fetchone()

        if not categoria:
            raise ErrorApi(400, "Categoría no válida")

        campos["categoria_id"] = categoria["id"]

    if completo or "precio_actual" in datos:
        campos["precio_actual"] = numero(
            datos, "precio_actual", "El precio", 0, Decimal("99999999.99")
        )

    if "precio_anterior" in datos:
        campos["precio_anterior"] = (
            numero(datos, "precio_anterior", "El precio anterior", 0, Decimal("99999999.99"))
            if datos["precio_anterior"] is not None
            else None
        )

    if "descuento_pct" in datos:
        campos["descuento_pct"] = numero(
            datos, "descuento_pct", "El descuento", 0, 100, entero=True
        )

    if "stock" in datos:
        campos["stock"] = numero(
            datos, "stock", "El stock", 0, 1000000, entero=True
        )

    if "imagen_url" in datos:
        imagen_url = texto(datos, "imagen_url")

        if len(imagen_url) > 500:
            raise ErrorApi(400, "La dirección de la imagen no puede tener más de 500 caracteres")

        campos["imagen_url"] = imagen_url or None

    if "tipo_envio" in datos:
        if datos["tipo_envio"] not in TIPOS_ENVIO:
            raise ErrorApi(400, "Tipo de envío no válido")

        campos["tipo_envio"] = datos["tipo_envio"]

    if "garantia_meses" in datos:
        campos["garantia_meses"] = numero(
            datos, "garantia_meses", "La garantía", 0, 255, entero=True
        )

    if "tipo_accesorio" in datos:
        tipo_accesorio = datos["tipo_accesorio"] or None

        if tipo_accesorio is not None and tipo_accesorio not in TIPOS_ACCESORIO:
            raise ErrorApi(400, "Tipo de accesorio no válido")

        campos["tipo_accesorio"] = tipo_accesorio

    return campos


def proveedor_de(cursor, usuario_id):
    """Id del proveedor que corresponde al usuario con sesión iniciada."""
    cursor.execute(
        "SELECT id FROM proveedores WHERE usuario_id = %s",
        (usuario_id,),
    )

    proveedor = cursor.fetchone()

    if not proveedor:
        raise ErrorApi(
            403,
            "Tu cuenta no tiene una tienda registrada"
        )

    return proveedor["id"]


def crear_slug(cursor, titulo):
    """Arma el slug a partir del título: "Audífonos Sony" -> "audifonos-sony"."""
    sin_tildes = "".join(
        letra
        for letra in unicodedata.normalize("NFD", titulo.lower())
        if not unicodedata.combining(letra)
    )

    base = re.sub(r"[^a-z0-9]+", "-", sin_tildes).strip("-")[:100].strip("-") or "producto"
    slug = base
    intento = 2

    # Si ya existe, se le agrega un número: audifonos-sony-2
    while True:
        cursor.execute(
            "SELECT 1 AS existe FROM productos WHERE slug = %s",
            (slug,),
        )

        if not cursor.fetchone():
            return slug

        slug = f"{base}-{intento}"
        intento += 1


def producto_propio(cursor, usuario_id, slug):
    """Comprueba que el producto exista y sea del proveedor. Devuelve su id."""
    cursor.execute(
        """
        SELECT p.id
        FROM productos p
        JOIN proveedores pr
            ON pr.id = p.proveedor_id
        WHERE p.slug = %s
          AND pr.usuario_id = %s
          AND p.activo = 1
        """,
        (slug, usuario_id),
    )

    producto = cursor.fetchone()

    if not producto:
        raise ErrorApi(
            404,
            "El producto no existe"
        )

    return producto["id"]


def crear_producto(cursor, usuario_id, datos):
    proveedor_id = proveedor_de(cursor, usuario_id)
    campos = leer_producto(cursor, datos, completo=True)
    slug = crear_slug(cursor, campos["titulo"])

    # Los nombres de columna salen de leer_producto, nunca de lo que envía el front.
    columnas = ["slug", "proveedor_id", *campos]
    valores = [slug, proveedor_id, *campos.values()]

    cursor.execute(
        f"""
        INSERT INTO productos ({", ".join(columnas)})
        VALUES ({", ".join(["%s"] * len(valores))})
        """,
        tuple(valores),
    )

    return obtener_producto(cursor, slug)


def editar_producto(cursor, usuario_id, slug, datos):
    producto_id = producto_propio(cursor, usuario_id, slug)
    campos = leer_producto(cursor, datos, completo=False)

    if not campos:
        raise ErrorApi(
            400,
            "No se envió ningún dato para actualizar"
        )

    # Los nombres de columna salen de leer_producto, nunca de lo que envía el front.
    asignaciones = ", ".join(f"{columna} = %s" for columna in campos)

    cursor.execute(
        f"""
        UPDATE productos
        SET {asignaciones},
            actualizado_en = SYSDATETIME()
        WHERE id = %s
        """,
        (*campos.values(), producto_id),
    )

    return obtener_producto(cursor, slug)


def eliminar_producto(cursor, usuario_id, slug):
    producto_id = producto_propio(cursor, usuario_id, slug)

    # No se borra la fila: los pedidos ya hechos siguen apuntando al producto.
    cursor.execute(
        """
        UPDATE productos
        SET activo = 0,
            actualizado_en = SYSDATETIME()
        WHERE id = %s
        """,
        (producto_id,),
    )

    return {"mensaje": "Producto eliminado"}


@manejar
def lambda_handler(event, context):
    accion = metodo(event)
    slug = parametro(event, "slug")

    # Ver el catálogo es público; solo las rutas del proveedor piden token.
    usuario_id = None

    if accion in ("POST", "PUT", "DELETE") or (
        accion == "GET"
        and not slug
        and parametro_consulta(event, "mios")
    ):
        usuario_id = usuario_actual(event, "proveedor")["usuario_id"]

    with conexion() as cursor:

        # GET /productos
        # GET /productos?buscar=...
        # GET /productos?mios=1 (productos del proveedor)
        if accion == "GET" and not slug:
            return respuesta(
                200,
                listar_productos(cursor, event, usuario_id)
            )

        # GET /productos/{slug}
        if accion == "GET" and slug:
            return respuesta(
                200,
                obtener_producto(cursor, slug)
            )

        # POST /productos
        if accion == "POST" and not slug:
            return respuesta(
                201,
                crear_producto(cursor, usuario_id, cuerpo(event))
            )

        # PUT /productos/{slug}
        if accion == "PUT" and slug:
            return respuesta(
                200,
                editar_producto(cursor, usuario_id, slug, cuerpo(event))
            )

        # DELETE /productos/{slug}
        if accion == "DELETE" and slug:
            return respuesta(
                200,
                eliminar_producto(cursor, usuario_id, slug)
            )

        raise ErrorApi(
            404,
            "Ruta no encontrada"
        )