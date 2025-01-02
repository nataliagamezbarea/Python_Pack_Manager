const vscode = require("vscode");
const { manejarSolicitudCrear } = require("./fileUtils");

function registrarComandos(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("createPythonPackage.createPythonPackage", (uri) =>
      manejarSolicitudCrear("paquete", uri)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("createPythonPackage.createPythonProject", (uri) =>
      manejarSolicitudCrear("proyecto", uri)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("createPythonPackage.createPythonFile", (uri) =>
      manejarSolicitudCrear("fichero", uri)
    )
  );

  vscode.commands.executeCommand("setContext", "createPythonPackage.context", true);
}

module.exports = { registrarComandos };
