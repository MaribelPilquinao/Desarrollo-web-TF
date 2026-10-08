"""Lectura de la petición de API Gateway y formato único de las respuestas."""

import base64
import functools
import json
import logging
import os
from datetime import date, datetime
from decimal import Decimal

registro = logging.getLogger("malvitec")
registro.setLevel(logging.INFO)


class ErrorApi(Exception):
    """Error que se devuelve al front tal cual: código HTTP y mensaje."""

    def __init__(self, codigo, mensaje):
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje


def _encabezados():
    return {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": os.environ.get("CORS_ORIGEN", "*"),
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    }


def _convertir(valor):
    # SQL Server devuelve DECIMAL y DATETIME2, que json no sabe escribir.
    if isinstance(valor, Decimal):
        return float(valor)
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    raise TypeError(f"No se puede convertir {type(valor).__name__} a JSON")


def respuesta(codigo, datos):
    return {
        "statusCode": codigo,
        "headers": _encabezados(),
        "body": json.dumps(datos, default=_convertir, ensure_ascii=False),
    }


def metodo(event):
    # API HTTP (v2) lo trae en requestContext.http; API REST (v1) en httpMethod.
    http = (event.get("requestContext") or {}).get("http") or {}
    return (http.get("method") or event.get("httpMethod") or "").upper()


def parametro(event, nombre):
    """Parámetro de la ruta, por ejemplo el {slug} de /favoritos/{slug}."""
    return (event.get("pathParameters") or {}).get(nombre)


def encabezado(event, nombre):
    for clave, valor in (event.get("headers") or {}).items():
        if clave.lower() == nombre.lower():
            return valor
    return None


def cuerpo(event):
    """Cuerpo de la petición como diccionario. Vacío si no se envió nada."""
    texto = event.get("body")
    if not texto:
        return {}
    if event.get("isBase64Encoded"):
        texto = base64.b64decode(texto).decode("utf-8")
    try:
        datos = json.loads(texto)
    except ValueError:
        raise ErrorApi(400, "El cuerpo de la petición no es JSON válido")
    if not isinstance(datos, dict):
        raise ErrorApi(400, "El cuerpo de la petición debe ser un objeto JSON")
    return datos


def manejar(funcion):
    """Envuelve el handler: responde el preflight de CORS y convierte los errores en JSON."""

    @functools.wraps(funcion)
    def envoltura(event, context):
        try:
            if metodo(event) == "OPTIONS":
                return respuesta(200, {})
            return funcion(event, context)
        except ErrorApi as error:
            return respuesta(error.codigo, {"error": error.mensaje})
        except Exception:
            # El detalle queda en CloudWatch; al front no se le envía nada técnico.
            registro.exception("Error inesperado")
            return respuesta(500, {"error": "Error interno"})

    return envoltura
