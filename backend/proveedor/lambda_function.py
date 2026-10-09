import re
import unicodedata
from decimal import Decimal, InvalidOperation

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, respuesta, usuario_actual

PRECIO_MAXIMO = Decimal("99999999.99")
STOCK_MAXIMO = 100000
TIPOS_ENVIO = ("gratis", "estandar")
TIPOS_ACCESORIO = ("case", "protector", "bateria", "cargador")
URL_VALIDA = re.compile(r"^https?://\S$", re.IGNORECASE)
MAXIMO_RESPUESTA = 500

# Estados que un proveedor puede dar a un ítem de pedido. Completado, Entregado y Cancelado son finales.
TRANSICIONES_PEDIDO = {
    "Pendiente": ("En camino", "Cancelado"),
    "En camino": ("Entregado", "Cancelado"),
}

COLUMNAS_PRODUCTO = """
    p.slug, p.titulo, p.descripcion, c.slug AS categoria, c.nombre AS categoria_nombre,
    p.precio_actual, p.precio_anterior, p.descuento_pct, p.stock, p.imagen_url,
    p.tipo_envio, p.garantia_meses, p.tipo_accesorio, p.activo, p.actualizado_en
"""

COLUMNAS_PEDIDO = """
    i.id, o.codi, o.creado_en AS fecha,
    RTRIM(CONCAT(o.entrega_nombres, N' ', o.entrega_apellidos)) AS cliente,
    o.entrega_telefono AS telefono, o.entrega_departamento AS departamento,
    o.entrega_distrito AS distrito, o.entrega_direccion AS direccion,
    o.entrega_referencia AS referencia, o.metodo_pa AS metodo_pago,
    i.titulo AS producto, i.cantidad, i.precio_unitario,
    i.cantidad * i.precio_unitario AS total, i.estado
"""


# --------------------------------------------------------------------- utilidades


def buscar_proveedor(cursor, usuario_id):
    cursor.execute(
        "SELECT id, nombre_comercial FROM proveedores WHERE usuario_id = %s", (usuario_id,)
    )
    proveedor = cursor.fetchone()
    if not proveedor:
        raise ErrorApi(403, "Tu cuenta no tiene un perfil de proveedor")
    return proveedor


def leer_id(texto):
    if not texto or not texto.isdigit():
        raise ErrorApi(404, "Ruta no encontrada")
    return int(texto)


def crear_slug(titulo):
    base = unicodedata.normalize("NFKD", titulo).encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-z0-9]", "-", base.lower()).strip("-")[:100].strip("-")
    return base or "producto"


def slug_libre(cursor, titulo):
    base = crear_slug(titulo)
    candidato, numero = base, 1
    while True:
        cursor.execute("SELECT 1 AS existe FROM productos WHERE slug = %s", (candidato,))
        if not cursor.fetchone():
            return candidato
        numero = 1
        candidato = f"{base}-{numero}"


# ----------------------------------------------------------------- validaciones


def leer_texto(datos, campo, nombre, minimo, maximo, obligatorio=True):
    valor = datos.get(campo)
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        if obligatorio:
            raise ErrorApi(400, f"Ingresa {nombre}")
        return None
    if not isinstance(valor, str):
        raise ErrorApi(400, f"{nombre.capitalize()} no es válido")
    valor = valor.strip()
    if not minimo <= len(valor) <= maximo:
        raise ErrorApi(400, f"{nombre.capitalize()} debe tener entre {minimo} y {maximo} caracteres")
    return valor


def leer_entero(valor, nombre, minimo, maximo):
    # bool es subclase de int en Python: true no cuenta como número.
    if isinstance(valor, bool) or not isinstance(valor, int) or not minimo <= valor <= maximo:
        raise ErrorApi(400, f"{nombre.capitalize()} debe ser un número entero entre {minimo} y {maximo}")
    return valor


def leer_precio(valor, nombre):
    mensaje = f"{nombre.capitalize()} debe ser un monto mayor que 0, con máximo 2 decimales"
    if isinstance(valor, bool) or not isinstance(valor, (int, float, str)):
        raise ErrorApi(400, mensaje)
    try:
        numero = Decimal(str(valor).strip())
    except InvalidOperation:
        raise ErrorApi(400, mensaje)
    if not numero.is_finite() or numero.as_tuple().exponent < -2 or not 0 < numero <= PRECIO_MAXIMO:
        raise ErrorApi(400, mensaje)
    return numero


def validar_campos(cursor, datos, completo):
    """Devuelve {columna: valor} con los campos enviados, validados.

    Con completo=True (alta) exige los obligatorios. Con completo=False (edición) solo valida lo que llega.
    Los nombres de columna salen de este código, nunca del cliente.
    """
    cambios = {}

    def enviado(campo):
        return campo in datos

    if completo or enviado("titulo"):
        cambios["titulo"] = leer_texto(datos, "titulo", "el nombre del producto", 3, 200)
    if enviado("descripcion"):
        cambios["descripcion"] = leer_texto(datos, "descripcion", "la descripción", 1, 4000, obligatorio=False)
    if completo or enviado("categoria"):
        slug = datos.get("categoria")
        cursor.execute("SELECT id, slug FROM categorias WHERE slug = %s", (slug if isinstance(slug, str) else "",))
        categoria = cursor.fetchone()
        if not categoria:
            raise ErrorApi(400, "Elige una categoría válida")
        cambios["categoria_id"] = categoria["id"]
        cambios["_categoria_slug"] = categoria["slug"]
    if completo or enviado("precio_actual"):
        cambios["precio_actual"] = leer_precio(datos.get("precio_actual"), "el precio")
    if enviado("precio_anterior"):
        valor = datos["precio_anterior"]
        cambios["precio_anterior"] = None if valor in (None, "") else leer_precio(valor, "el precio anterior")
    if completo or enviado("stock"):
        cambios["stock"] = leer_entero(datos.get("stock"), "el stock", 0, STOCK_MAXIMO)
    if enviado("imagen_url"):
        valor = datos["imagen_url"]
        if valor in (None, ""):
            cambios["imagen_url"] = None
        elif not isinstance(valor, str) or len(valor) > 500 or not URL_VALIDA.match(valor.strip()):
            raise ErrorApi(400, "La imagen debe ser un enlace que empiece con http:// o https://")
        else:
            cambios["imagen_url"] = valor.strip()
    if enviado("tipo_envio") or completo:
        tipo = datos.get("tipo_envio", "estandar")
        if tipo not in TIPOS_ENVIO:
            raise ErrorApi(400, "El tipo de envío debe ser gratis o estandar")
        cambios["tipo_envio"] = tipo
    if enviado("garantia_meses") or completo:
        cambios["garantia_meses"] = leer_entero(datos.get("garantia_meses", 12), "la garantía", 0, 60)
    if enviado("tipo_accesorio"):
        tipo = datos["tipo_accesorio"]
        if tipo not in (None, "")  TIPOS_ACCESORIO:
            raise ErrorApi(400, "El tipo de accesorio no es válido")
        cambios["tipo_accesorio"] = tipo or None
    if enviado("activo"):
        if not isinstance(datos["activo"], bool):
            raise ErrorApi(400, "El campo activo debe ser true o false")
        cambios["activo"] = 1 if datos["activo"] else 0
    return cambios


def calcular_descuento(precio_actual, precio_anterior):
    if precio_anterior is None:
        return 0
    if precio_anterior <= precio_actual:
        raise ErrorApi(400, "El precio anterior debe ser mayor que el precio actual")
    return int(round((1 - Decimal(precio_actual) / Decimal(precio_anterior)) * 100))


# -------------------------------------------------------------------- productos


def leer_producto(cursor, proveedor_id, slug):
    cursor.execute(
        f"""
        SELECT {COLUMNAS_PRODUCTO}
        FROM productos p JOIN categorias c ON c.id = p.categoria_id
        WHERE p.slug = %s AND p.proveedor_id = %s
        """,
        (slug, proveedor_id),
    )
    producto = cursor.fetchone()
    if not producto:
        raise ErrorApi(404, "El producto no existe")
    return producto


def listar_productos(cursor, proveedor_id):
    cursor.execute(
        f"""
        SELECT {COLUMNAS_PRODUCTO}
        FROM productos p JOIN categorias c ON c.id = p.categoria_id
        WHERE p.proveedor_id = %s
        ORDER BY p.activo DESC, p.actualizado_en DESC, p.id DESC
        """,
        (proveedor_id,),
    )
    return respuesta(200, cursor.fetchall())


def listar_categorias(cursor):
    cursor.execute("SELECT slug, nombre FROM categorias ORDER BY nombre")
    return respuesta(200, cursor.fetchall())


def crear_producto(cursor, proveedor_id, datos):
    cambios = validar_campos(cursor, datos, completo=True)
    cambios.setdefault("precio_anterior", None)
    categoria_slug = cambios.pop("_categoria_slug")
    descuento = calcular_descuento(cambios["precio_actual"], cambios["precio_anterior"])
    # Solo los accesorios llevan tipo (lo usa Malvino para la compatibilidad).
    tipo_accesorio = cambios.get("tipo_accesorio") if categoria_slug == "accesorios" else None
    slug = slug_libre(cursor, cambios["titulo"])

    cursor.execute(
        """
        INSERT INTO productos
          (slug, proveedor_id, categoria_id, titulo, descripcion, precio_actual, precio_anterior,
           descuento_pct, stock, imagen_url, tipo_envio, garantia_meses, tipo_accesorio)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            slug, proveedor_id, cambios["categoria_id"], cambios["titulo"], cambios.get("descripcion"),
            cambios["precio_actual"], cambios["precio_anterior"], descuento, cambios["stock"],
            cambios.get("imagen_url"), cambios["tipo_envio"], cambios["garantia_meses"], tipo_accesorio,
        ),
    )
    return respuesta(201, leer_producto(cursor, proveedor_id, slug))


def editar_producto(cursor, proveedor_id, slug, datos):
    actual = leer_producto(cursor, proveedor_id, slug)
    cambios = validar_campos(cursor, datos, completo=False)
    if not cambios:
        raise ErrorApi(400, "No enviaste ningún cambio")

    categoria_slug = cambios.pop("_categoria_slug", actual["categoria"])
    precio_actual = cambios.get("precio_actual", actual["precio_actual"])
    precio_anterior = cambios["precio_anterior"] if "precio_anterior" in cambios else actual["precio_anterior"]
    if "precio_actual" in cambios or "precio_anterior" in cambios:
        cambios["descuento_pct"] = calcular_descuento(precio_actual, precio_anterior)
    if categoria_slug != "accesorios":
        cambios["tipo_accesorio"] = None

    asignaciones = ", ".join(f"{columna} = %s" for columna in cambios)
    cursor.execute(
        f"UPDATE productos SET {asignaciones}, actualizado_en = SYSDATETIME() WHERE slug = %s AND proveedor_id = %s",
        (*cambios.values(), slug, proveedor_id),
    )
    return respuesta(200, leer_producto(cursor, proveedor_id, slug))


# ---------------------------------------------------------------------- pedidos


def listar_pedidos(cursor, proveedor_id, limite=200):
    cursor.execute(
        f"""
        SELECT TOP {int(limite)} {COLUMNAS_PEDIDO}
        FROM pedido_items i JOIN pedidos o ON o.id = i.pedido_id
        WHERE i.proveedor_id = %s
        ORDER BY o.creado_en DESC, i.id DESC
        """,
        (proveedor_id,),
    )
    return cursor.fetchall()


def cambiar_estado_pedido(cursor, proveedor_id, item_id, datos):
    nuevo = datos.get("estado")
    cursor.execute(
        "SELECT estado FROM pedido_items WHERE id = %s AND proveedor_id = %s", (item_id, proveedor_id)
    )
    item = cursor.fetchone()
    if not item:
        raise ErrorApi(404, "El pedido no existe")
    permitidos = TRANSICIONES_PEDIDO.get(item["estado"], ())
    if nuevo not in permitidos:
        if not permitidos:
            raise ErrorApi(409, f"Un pedido {item['estado'].lower()} ya no se puede modificar")
        raise ErrorApi(409, f"Desde {item['estado']} solo puedes pasar a: {', '.join(permitidos)}")

    cursor.execute(
        "UPDATE pedido_items SET estado = %s WHERE id = %s AND proveedor_id = %s", (nuevo, item_id, proveedor_id)
    )
    cursor.execute(
        f"""
        SELECT {COLUMNAS_PEDIDO}
        FROM pedido_items i JOIN pedidos o ON o.id = i.pedido_id
        WHERE i.id = %s AND i.proveedor_id = %s
        """,
        (item_id, proveedor_id),
    )
    return respuesta(200, cursor.fetchone())


# -------------------------------------------------------------------- consultas


def listar_consultas(cursor, proveedor_id):
    cursor.execute(
        """
        SELECT TOP 200 c.id, p.titulo AS producto, p.slug AS producto_slug,
               RTRIM(CONCAT(u.nombre, N' ', u.apellidos)) AS cliente,
               c.mensaje, c.respuesta, c.estado, c.creado_en AS fecha, c.respondida_en
        FROM consultas c
        JOIN productos p ON p.id = c.producto_id
        JOIN usuarios u ON u.id = c.usuario_id
        WHERE p.proveedor_id = %s
        ORDER BY CASE c.estado WHEN 'Nueva' THEN 0 ELSE 1 END, c.creado_en DESC, c.id DESC
        """,
        (proveedor_id,),
    )
    return respuesta(200, cursor.fetchall())


def responder_consulta(cursor, proveedor_id, consulta_id, datos):
    texto = leer_texto(datos, "respuesta", "tu respuesta", 1, MAXIMO_RESPUESTA)
    cursor.execute(
        """
        SELECT c.estado
        FROM consultas c JOIN productos p ON p.id = c.producto_id
        WHERE c.id = %s AND p.proveedor_id = %s
        """,
        (consulta_id, proveedor_id),
    )
    consulta = cursor.fetchone()
    if not consulta:
        raise ErrorApi(404, "La consulta no existe")
    if consulta["estado"] == "Respondida":
        raise ErrorApi(409, "Esa consulta ya fue respondida")

    cursor.execute(
        "UPDATE consultas SET respuesta = %s, estado = 'Respondida', respondida_en = SYSDATETIME() WHERE id = %s",
        (texto, consulta_id),
    )
    return respuesta(200, {"id": consulta_id, "respuesta": texto, "estado": "Respondida"})


# ---------------------------------------------------------------------- resumen


def resumen(cursor, proveedor):
    pid = proveedor["id"]
    cursor.execute(
        """
        SELECT
          (SELECT COUNT(*) FROM productos WHERE proveedor_id = %s AND activo = 1) AS productos_publicados,
          (SELECT COUNT(*) FROM productos WHERE proveedor_id = %s AND activo = 1 AND stock = 0) AS sin_stock,
          (SELECT COUNT(*) FROM pedido_items WHERE proveedor_id = %s AND estado = 'Pendiente') AS pedidos_pendientes,
          (SELECT COUNT(*) FROM consultas c JOIN productos p ON p.id = c.producto_id
             WHERE p.proveedor_id = %s AND c.estado = 'Nueva') AS consultas_nuevas,
          (SELECT ISNULL(SUM(cantidad * precio_unitario), 0) FROM pedido_items
             WHERE proveedor_id = %s AND estado <> 'Cancelado') AS ventas
        """,
        (pid, pid, pid, pid, pid),
    )
    datos = cursor.fetchone()
    datos["nombre_comercial"] = proveedor["nombre_comercial"]
    datos["ultimos_pedidos"] = listar_pedidos(cursor, pid, limite=5)
    cursor.execute(
        "SELECT TOP 5 slug, titulo FROM productos WHERE proveedor_id = %s AND activo = 1 AND stock = 0 ORDER BY titulo",
        (pid,),
    )
    datos["productos_sin_stock"] = cursor.fetchall()
    return respuesta(200, datos)


# ----------------------------------------------------------------------- rutas


def tramos_de_ruta(event):
    camino = event.get("rawPath") or event.get("path") or ""
    partes = [parte for parte in camino.split("/") if parte]
    if "proveedor" not in partes:
        raise ErrorApi(404, "Ruta no encontrada")
    return partes[partes.index("proveedor")  1:]


@manejar
def lambda_handler(event, context):
    usuario = usuario_actual(event, rol="proveedor")
    accion = metodo(event)
    ruta = tramos_de_ruta(event)
    recurso = ruta[0] if ruta else ""
    detalle = ruta[1] if len(ruta) == 2 else None
    if len(ruta) > 2:
        raise ErrorApi(404, "Ruta no encontrada")

    with conexion() as cursor:
        proveedor = buscar_proveedor(cursor, usuario["usuario_id"])
        pid = proveedor["id"]

        if recurso == "resumen" and not detalle and accion == "GET":
            return resumen(cursor, proveedor)
        if recurso == "categorias" and not detalle and accion == "GET":
            return listar_categorias(cursor)

        if recurso == "productos":
            if not detalle and accion == "GET":
                return listar_productos(cursor, pid)
            if not detalle and accion == "POST":
                return crear_producto(cursor, pid, cuerpo(event))
            if detalle and accion == "GET":
                return respuesta(200, leer_producto(cursor, pid, detalle))
            if detalle and accion == "PUT":
                return editar_producto(cursor, pid, detalle, cuerpo(event))

        if recurso == "pedidos":
            if not detalle and accion == "GET":
                return respuesta(200, listar_pedidos(cursor, pid))
            if detalle and accion == "PUT":
                return cambiar_estado_pedido(cursor, pid, leer_id(detalle), cuerpo(event))

        if recurso == "consultas":
            if not detalle and accion == "GET":
                return listar_consultas(cursor, pid)
            if detalle and accion == "PUT":
                return responder_consulta(cursor, pid, leer_id(detalle), cuerpo(event))

    raise ErrorApi(404, "Ruta no encontrada")