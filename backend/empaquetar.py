"""Arma en backend/dist/ los .zip de la Layer y de cada Lambda. Uso en backend/README.md."""

import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
DIST = BACKEND / "dist"
ARMADO = DIST / "capa"

# Debe coincidir con el runtime y la arquitectura que se eligen al crear la Lambda.
VERSION_PYTHON = "3.13"
PLATAFORMA = "manylinux2014_x86_64"


def comprimir(origen, destino, patron="**/*"):
    # Se usa zipfile y no Compress-Archive: el zip de PowerShell 5.1 guarda las rutas con "\" y Lambda no las encuentra.
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as archivo:
        for ruta in sorted(origen.glob(patron)):
            if ruta.is_file() and "__pycache__" not in ruta.parts:
                archivo.write(ruta, ruta.relative_to(origen).as_posix())
    print(f"  {destino.relative_to(BACKEND)}  ({destino.stat().st_size / 1024:.0f} KB)")


def armar_capa():
    shutil.rmtree(ARMADO, ignore_errors=True)
    destino = ARMADO / "python"
    shutil.copytree(BACKEND / "capa" / "python", destino, ignore=shutil.ignore_patterns("__pycache__"))
    # pymssql y bcrypt traen código compilado: se bajan las versiones de Linux, no las de Windows.
    subprocess.run(
        [
            sys.executable, "-m", "pip", "install", "--quiet", "--upgrade",
            "--requirement", str(BACKEND / "requirements.txt"),
            "--target", str(destino),
            "--platform", PLATAFORMA,
            "--implementation", "cp",
            "--python-version", VERSION_PYTHON,
            "--only-binary=:all:",
        ],
        check=True,
    )
    comprimir(ARMADO, DIST / "capa-malvitec.zip")
    shutil.rmtree(ARMADO)


if __name__ == "__main__":
    DIST.mkdir(exist_ok=True)
    print("Paquetes generados:")
    armar_capa()
    for handler in sorted(BACKEND.glob("*/lambda_function.py")):
        comprimir(handler.parent, DIST / f"malvitec-{handler.parent.name}.zip", "*.py")
