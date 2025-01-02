const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");  
const { obtenerCarpetaTrabajo, mostrarError } = require("./fileUtils"); 
const { configurarProyectoPython } = require("./fileUtils");

class ProveedorSidebarPaquetePython {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
  }

  resolveWebviewView(webviewView) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.obtenerContenidoHtml();
    webviewView.webview.onDidReceiveMessage(this.manejarMensaje.bind(this));
  }

  async manejarMensaje(mensaje) {
    const carpetaTrabajo = obtenerCarpetaTrabajo();
    if (!carpetaTrabajo || !mensaje.text) {
      return mostrarError("Falta la carpeta de trabajo o el nombre.");
    }

    const rutaDestino = path.join(carpetaTrabajo, mensaje.text);
    try {
      await fs.promises.mkdir(rutaDestino, { recursive: true });

      if (mensaje.command === "paquete") {
        await fs.promises.writeFile(path.join(rutaDestino, "__init__.py"), "");
        vscode.window.showInformationMessage(`Paquete '${mensaje.text}' creado correctamente.`);
      } else if (mensaje.command === "fichero") {
        await fs.promises.writeFile(path.join(rutaDestino, mensaje.text), "# Este es un fichero Python.\n");
        vscode.window.showInformationMessage(`Fichero Python '${mensaje.text}' creado correctamente.`);
      } else {
        await configurarProyectoPython(rutaDestino);

        const respuesta = await vscode.window.showInformationMessage(
          `Proyecto '${mensaje.text}' creado correctamente. ¿Deseas abrirlo?`,
          { modal: true },
          "Abrir", "Abrir en una pestaña nueva", "No Abrir"
        );

        if (respuesta === "Abrir") {
          exec(`code . --reuse-window`, { cwd: rutaDestino });
        } else if (respuesta === "Abrir en una pestaña nueva") {
          exec(`code .`, { cwd: rutaDestino });
        }
      }
    } catch (error) {
      mostrarError(`Error: ${error.message}`);
    }
  }

  obtenerContenidoHtml() {
    return `<!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Crear Paquete o Proyecto Python</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          input, select, button {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
          }
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <h1>Crear Paquete o Proyecto Python</h1>
        <select id="tipo">
          <option value="proyecto">Proyecto Python</option>
          <option value="paquete">Paquete Python</option>
          <option value="fichero">Fichero Python</option>
        </select>
        <input type="text" id="nombre" placeholder="Introduce el nombre..." />
        <button id="crear">Crear</button>
        <script>
          const vscode = acquireVsCodeApi();
          document.getElementById("crear").addEventListener("click", () => {
            const tipo = document.getElementById("tipo").value;
            const nombre = document.getElementById("nombre").value;
            vscode.postMessage({ command: tipo, text: nombre });
          });
        </script>
      </body>
      </html>`;  
  }
}

module.exports = { ProveedorSidebarPaquetePython };
