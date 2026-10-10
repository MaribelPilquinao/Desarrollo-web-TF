"""API Gateway local (http://localhost:3000) para probar las Lambdas sin AWS. Uso en backend/README.md."""

import importlib.util
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

BACKEND = Path(__file__).resolve().parent
PUERTO = 3000

# Primer tramo de la ruta -> carpeta de la Lambda que la atiende.
LAMBDAS = {
    "auth": "auth",
    "favoritos": "favoritos",
    "carrito": "carrito",
    "productos": "productos",
}


def cargar_variables():
    archivo = BACKEND / ".env"
    if not archivo.exists():
        sys.exit("Falta backend/.env: copia .env.ejemplo y complétalo.")
    for linea in archivo.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if linea and not linea.startswith("#") and "=" in linea:
            clave, valor = linea.split("=", 1)
            os.environ[clave.strip()] = valor.strip()


def cargar_handler(carpeta):
    # Todas las Lambdas se llaman lambda_function.py, así que cada una se carga con su propio nombre.
    ruta = BACKEND / carpeta / "lambda_function.py"
    especificacion = importlib.util.spec_from_file_location(f"lambda_{carpeta}", ruta)
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    return modulo.lambda_handler


class Peticion(BaseHTTPRequestHandler):
    def atender(self):

        url = urlsplit(self.path)
        tramos = [
            unquote(tramo)
            for tramo in url.path.split("/")
            if tramo
        ]
        consulta = {
            clave: valores[-1]
            for clave, valores in parse_qs(url.query).items()
        }

        carpeta = LAMBDAS.get(tramos[0]) if tramos else None
        if not carpeta or len(tramos) > 2:
            self.responder({"statusCode": 404, "headers": {}, "body": '{"error": "Ruta no encontrada"}'})
            return

        largo = int(self.headers.get("Content-Length") or 0)
        event = {
            "requestContext": {"http": {"method": self.command}},
            "rawPath": url.path,
            "headers": dict(self.headers.items()),
            "pathParameters": {"slug": tramos[1]} if len(tramos) == 2 else None,
            "queryStringParameters": consulta or None,
            "body": self.rfile.read(largo).decode("utf-8") if largo else None,
        }
        self.responder(cargar_handler(carpeta)(event, None))

    def responder(self, resultado):
        contenido = resultado["body"].encode("utf-8")
        self.send_response(resultado["statusCode"])
        for clave, valor in resultado["headers"].items():
            self.send_header(clave, valor)
        self.send_header("Content-Length", str(len(contenido)))
        self.end_headers()
        self.wfile.write(contenido)

    do_GET = do_POST = do_PUT = do_DELETE = do_OPTIONS = atender


if __name__ == "__main__":
    sys.path.insert(0, str(BACKEND / "capa" / "python"))
    cargar_variables()

    if len(sys.argv) >= 3 and sys.argv[1] == "token":
        from malvitec_comun import crear_token

        rol = sys.argv[3] if len(sys.argv) > 3 else "cliente"
        print(crear_token(int(sys.argv[2]), rol))
    else:
        print(f"API local de Malvitec en http://localhost:{PUERTO}  (Ctrl+C para detener)")
        ThreadingHTTPServer(("localhost", PUERTO), Peticion).serve_forever()
