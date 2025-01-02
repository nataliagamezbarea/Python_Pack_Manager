const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const vscode = require("vscode");

async function manejarSolicitudCrear(tipo, uri) {
  const carpetaTrabajo = obtenerCarpetaTrabajo();
  if (!carpetaTrabajo) {
    return mostrarError("Por favor, abre un espacio de trabajo o carpeta antes de proceder.");
  }

  const carpetaDestino = uri ? uri.fsPath : carpetaTrabajo;
  let nombre = await pedirNombre(tipo);

  if (!nombre) return;
  
  switch (tipo) {
    case "fichero":
      await crearArchivoPython(nombre, carpetaDestino);
      break;
    case "paquete":
      await crearPaquetePython(nombre, carpetaDestino);
      break;
    case "proyecto":
      await crearProyectoPython(nombre, carpetaDestino);
      break;
    default:
      break;
  }
}

async function crearArchivoPython(nombre, carpetaDestino) {
  if (!nombre.endsWith(".py")) nombre += ".py";
  const rutaDestino = path.join(carpetaDestino, nombre);
  try {
    await fs.promises.writeFile(rutaDestino, "");
    vscode.window.showInformationMessage(`Fichero Python '${nombre}' creado correctamente.`);
  } catch (error) {
    mostrarError(`Error al crear el fichero Python: ${error.message}`);
  }
}

async function crearPaquetePython(nombre, carpetaDestino) {
  const rutaDestino = path.join(carpetaDestino, nombre);
  try {
    await fs.promises.mkdir(rutaDestino, { recursive: true });
    await fs.promises.writeFile(path.join(rutaDestino, "__init__.py"), "");
    vscode.window.showInformationMessage(`Paquete '${nombre}' creado correctamente.`);
  } catch (error) {
    mostrarError(`Error al crear el paquete Python: ${error.message}`);
  }
}

async function crearProyectoPython(nombre, carpetaDestino) {
  const rutaDestino = path.join(carpetaDestino, nombre);
  try {
    await fs.promises.mkdir(rutaDestino, { recursive: true });
    await configurarProyectoPython(rutaDestino);

    const respuesta = await vscode.window.showInformationMessage(
      `Proyecto '${nombre}' creado correctamente. ¿Deseas abrirlo?`,
      { modal: true },
      "Abrir", "Abrir en una pestaña nueva", "No Abrir"
    );

    if (respuesta === "Abrir") {
      exec(`code . --reuse-window`, { cwd: rutaDestino });
    } else if (respuesta === "Abrir en una pestaña nueva") {
      exec(`code .`, { cwd: rutaDestino });
    }
  } catch (error) {
    mostrarError(`Error al crear el proyecto Python: ${error.message}`);
  }
}

async function pedirNombre(tipo) {
  return await vscode.window.showInputBox({
    prompt: `Introduce el nombre del ${tipo}`,
    placeHolder: `Ejemplo: mi_${tipo}`,
  });
}

function obtenerCarpetaTrabajo() {
  return vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
}

function mostrarError(mensaje) {
  vscode.window.showErrorMessage(mensaje);
}

async function configurarProyectoPython(rutaDestino) {
  await crearArchivoEnv(rutaDestino);
  await configurarVSCode(rutaDestino);
  await crearEntornoVirtual(rutaDestino);
}

async function crearArchivoEnv(rutaDestino) {
  const rutaEnv = path.join(rutaDestino, ".env");
  if (!fs.existsSync(rutaEnv)) {
    await fs.promises.writeFile(rutaEnv, "# Configuración para Visual Studio\nPYTHONPATH=.\n");
  }
}

async function configurarVSCode(rutaDestino) {
  const rutaCarpetaVSCode = path.join(rutaDestino, ".vscode");
  if (!fs.existsSync(rutaCarpetaVSCode)) {
    await fs.promises.mkdir(rutaCarpetaVSCode, { recursive: true });
  }

  const rutaConfiguracion = path.join(rutaCarpetaVSCode, "settings.json");
  const configuraciones = {
    "python.envFile": "${workspaceFolder}/.env",
    "python.defaultInterpreterPath": "${workspaceFolder}/.venv/Scripts/python.exe",
  };

  const configuracionesActuales = fs.existsSync(rutaConfiguracion)
    ? JSON.parse(await fs.promises.readFile(rutaConfiguracion, "utf-8"))
    : {};

  if (!configuracionesIguales(configuraciones, configuracionesActuales)) {
    await fs.promises.writeFile(rutaConfiguracion, JSON.stringify({ ...configuracionesActuales, ...configuraciones }, null, 2));
  }
}

function configuracionesIguales(config1, config2) {
  return JSON.stringify(config1) === JSON.stringify(config2);
}

async function crearEntornoVirtual(rutaDestino) {
  const rutaVenv = path.join(rutaDestino, ".venv");
  if (!fs.existsSync(rutaVenv)) {
    exec(`python -m venv ${rutaVenv}`, (error, stdout, stderr) => {
      if (error) {
        mostrarError(`Error al crear entorno virtual: ${stderr}`);
        return;
      }
      vscode.window.showInformationMessage("Entorno virtual '.venv' creado en la raíz del proyecto.");
    });
  }
}

module.exports = { obtenerCarpetaTrabajo, mostrarError, configurarProyectoPython, manejarSolicitudCrear };
