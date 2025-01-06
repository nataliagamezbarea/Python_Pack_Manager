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
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Creando proyecto de Python...",
        cancellable: false
      },
      async (progress, token) => {
        progress.report({ message: "Configurando entorno..." });

        await fs.promises.mkdir(rutaDestino, { recursive: true });

        await configurarProyectoPython(rutaDestino);

        await crearArchivoREADME(rutaDestino);
        await crearGitignore(rutaDestino); // Crear el archivo .gitignore aquí

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
      }
    );
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
  await configurarVSCode(rutaDestino);
  await crearEntornoVirtual(rutaDestino);
}

async function configurarVSCode(rutaDestino) {
  const rutaCarpetaVSCode = path.join(rutaDestino, ".vscode");
  if (!(await existeRuta(rutaCarpetaVSCode))) {
    await fs.promises.mkdir(rutaCarpetaVSCode, { recursive: true });
  }

  const rutaConfiguracion = path.join(rutaCarpetaVSCode, "settings.json");
  const configuraciones = {
    "python.defaultInterpreterPath": "${workspaceFolder}/.venv/Scripts/python.exe",
    "terminal.integrated.env.windows": {
      "PYTHONPATH": "${workspaceFolder}"
    },
    "terminal.integrated.env.linux": {
      "PYTHONPATH": "${workspaceFolder}"
    },
    "terminal.integrated.env.osx": {
      "PYTHONPATH": "${workspaceFolder}"
    }
  };

  const configuracionesActuales = await obtenerConfiguracionesActuales(rutaConfiguracion);
  
  if (!configuracionesIguales(configuraciones, configuracionesActuales)) {
    await fs.promises.writeFile(rutaConfiguracion, JSON.stringify({ ...configuracionesActuales, ...configuraciones }, null, 2));
  }
}

async function obtenerConfiguracionesActuales(rutaConfiguracion) {
  if (await existeRuta(rutaConfiguracion)) {
    const configuracionesString = await fs.promises.readFile(rutaConfiguracion, "utf-8");
    return JSON.parse(configuracionesString);
  }
  return {};
}

function configuracionesIguales(config1, config2) {
  return JSON.stringify(config1) === JSON.stringify(config2);
}

async function crearEntornoVirtual(rutaDestino) {
  const rutaVenv = path.join(rutaDestino, ".venv");

  if (!(await existeRuta(rutaVenv))) {
    try {
      await ejecutarComando(`python -m venv ${rutaVenv}`);
      vscode.window.showInformationMessage("Entorno virtual '.venv' creado en la raíz del proyecto.");
    } catch (error) {
      mostrarError(`Error al crear el entorno virtual: ${error.message}`);
    }
  }
}

function ejecutarComando(comando) {
  return new Promise((resolve, reject) => {
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function existeRuta(ruta) {
  try {
    await fs.promises.access(ruta);
    return true;
  } catch {
    return false;
  }
}

async function crearArchivoREADME(rutaDestino) {
  const rutaREADME = path.join(rutaDestino, "README.md");
  const contenido = `# Configuración de Entorno Virtual en Python

Un entorno virtual permite aislar las dependencias de tu proyecto de Python, asegurando que no interfieran con otras aplicaciones o proyectos. Aquí te explicamos cómo configurarlo.

## Requisitos Previos

1. Asegúrate de tener Python instalado en tu sistema. Verifica la versión ejecutando:
    \`\`\`sh
    python --version
    \`\`\`

## Crear un Entorno Virtual

1. Navega a la ruta de tu proyecto:
    \`\`\`sh
    cd ruta_del_proyecto
    \`\`\`

2. Crea el entorno virtual utilizando el módulo \`venv\`:
    \`\`\`sh
    python -m venv .venv
    \`\`\``;
  
  if (!(await existeRuta(rutaREADME))) {
    await fs.promises.writeFile(rutaREADME, contenido);
  }
}

async function crearGitignore(rutaDestino) {
  const rutaGitignore = path.join(rutaDestino, ".gitignore");
  const contenidoGitignore = `.venv/`;

  try {
    if (!(await existeRuta(rutaGitignore))) {
      await fs.promises.writeFile(rutaGitignore, contenidoGitignore);
      vscode.window.showInformationMessage("Archivo '.gitignore' creado correctamente.");
    }
  } catch (error) {
    mostrarError(`Error al crear el archivo .gitignore: ${error.message}`);
  }
}

module.exports = { obtenerCarpetaTrabajo, mostrarError, configurarProyectoPython, manejarSolicitudCrear };
