const vscode = require("vscode");
const { registrarComandos } = require("./commands");
const { ProveedorSidebarPaquetePython } = require("./sidebarProvider");

function activate(context) {
  registrarComandos(context);
  registrarSidebar(context);
}

function registrarSidebar(context) {
  vscode.window.registerWebviewViewProvider(
    "PythonPackManager-sidebar",
    new ProveedorSidebarPaquetePython(context.extensionUri)
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
