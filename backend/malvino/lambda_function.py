import json
import re
from malvitec_comun.conexion import obtener_conexion
from malvitec_comun.api import respuesta_exitosa, respuesta_error, respuesta_cors
from malvitec_comun.sesion import obtener_usuario_sesion

def lambda_handler(event, context):
    metodo = event.get('httpMethod', '')
    
    if metodo == 'OPTIONS':
        return respuesta_cors()

    if metodo != 'POST':
        return respuesta_error("Método no permitido", 405)

    try:
        cuerpo = json.loads(event.get('body') or '{}')
        accion = cuerpo.get('accion', 'consultar') # 'consultar' o 'escalar'
        
        usuario = obtener_usuario_sesion(event)
        conn = obtener_conexion()
        cursor = conn.cursor(as_dict=True)

        # Sub-flujo: Escalar explícitamente la pregunta a la tabla Consultas
        if accion == 'escalar':
            if not usuario:
                cursor.close()
                conn.close()
                return respuesta_error("Debes iniciar sesión para registrar una consulta a un proveedor.", 401)
            
            pregunta = cuerpo.get('pregunta', '').strip()
            id_producto = cuerpo.get('id_producto') # Opcional si la duda fue sobre un producto en particular

            cursor.execute("""
                INSERT INTO Consultas (id_usuario, id_producto, pregunta, fecha_pregunta, estado)
                VALUES (%s, %s, %s, GETDATE(), 'PENDIENTE')
            """, (usuario['id'], id_producto, pregunta))
            conn.commit()

            cursor.close()
            conn.close()
            return respuesta_exitosa({
                "mensaje": "Tu consulta ha sido registrada exitosamente. Un proveedor o asesor te responderá a la brevedad.",
                "escalado_exitoso": True
            })

        # Flujo estándar: Procesar mensaje del bot
        mensaje_usuario = cuerpo.get('mensaje', '').strip()
        if not mensaje_usuario:
            cursor.close()
            conn.close()
            return respuesta_error("El mensaje no puede estar vacío", 400)

        respuesta_texto, productos_sugeridos, puede_escalar = procesar_mensaje(cursor, mensaje_usuario, usuario)

        cursor.close()
        conn.close()

        return respuesta_exitosa({
            "respuesta": respuesta_texto,
            "productos": productos_sugeridos,
            "puede_escalar": puede_escalar,
            "pregunta_original": mensaje_usuario if puede_escalar else None
        })

    except Exception as e:
        return respuesta_error(f"Error procesando la solicitud: {str(e)}", 500)


def procesar_mensaje(cursor, mensaje, usuario):
    mensaje_lower = mensaje.lower()
    
    # 1. Caso: Consultas de pedidos
    if any(p in mensaje_lower for p in ['mi pedido', 'mis pedidos', 'estado de pedido', 'rastreo', 'orden']):
        if not usuario:
            return ("Para consultar el estado de tus compras, inicia sesión primero.", [], False)
        
        cursor.execute("""
            SELECT TOP 3 id_pedido, fecha_pedido, estado, total
            FROM Pedidos
            WHERE id_usuario = %s
            ORDER BY fecha_pedido DESC
        """, (usuario['id'],))
        pedidos = cursor.fetchall()
        
        if not pedidos:
            return ("No tienes pedidos registrados recientemente en Malvitec.", [], False)
        
        detalles = [f"• Pedido #{p['id_pedido']} ({p['estado']}) - Total: S/ {p['total']:.2f}" for p in pedidos]
        return ("Tus pedidos más recientes:\n" + "\n".join(detalles), [], False)

    # 2. Caso: Categorías del catálogo
    categorias_map = {
        'procesador': 'Procesadores', 'cpu': 'Procesadores', 'ryzen': 'Procesadores', 'intel': 'Procesadores',
        'tarjeta de video': 'Tarjetas de Video', 'grafica': 'Tarjetas de Video', 'gpu': 'Tarjetas de Video', 'rtx': 'Tarjetas de Video',
        'ram': 'Memorias RAM', 'memoria': 'Memorias RAM',
        'placa': 'Placas Madre', 'motherboard': 'Placas Madre',
        'fuente': 'Fuentes de Poder',
        'ssd': 'Almacenamiento', 'disco': 'Almacenamiento'
    }
    for kw, cat in categorias_map.items():
        if kw in mensaje_lower:
            cursor.execute("""
                SELECT TOP 3 p.id_producto, p.nombre, p.precio, p.stock, p.imagen_url
                FROM Productos p
                INNER JOIN Categorias c ON p.id_categoria = c.id_categoria
                WHERE c.nombre = %s AND p.stock > 0 AND p.activo = 1
                ORDER BY p.precio ASC
            """, (cat,))
            prods = cursor.fetchall()
            if prods:
                return (f"Opciones disponibles en {cat}:", formatear_productos(prods), False)

    # 3. Caso: Búsqueda textual en productos
    palabras = [w for w in re.findall(r'\w+', mensaje_lower) if len(w) > 3]
    for w in palabras:
        cursor.execute("""
            SELECT TOP 3 id_producto, nombre, precio, stock, imagen_url
            FROM Productos
            WHERE nombre LIKE %s AND stock > 0 AND activo = 1
        """, (f"%{w}%",))
        prods = cursor.fetchall()
        if prods:
            return ("Encontré estos artículos relacionados:", formatear_productos(prods), False)

    # 4. Caso SIN RESPUESTA / DUDA TÉCNICA COMPLEJA -> Activar Escalado
    return (
        "No encontré información exacta en el catálogo ni en las guías rápidas para resolver tu duda técnica.",
        [],
        True  # puede_escalar = True
    )

def formatear_productos(lista_sql):
    return [{
        "id": p['id_producto'],
        "nombre": p['nombre'],
        "precio": float(p['precio']),
        "stock": p['stock'],
        "imagen_url": p.get('imagen_url') or 'imagenes/malvitec-logo.png'
    } for p in lista_sql]