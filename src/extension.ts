import * as vscode from 'vscode';
import { ConnectionManager } from './core/ConnectionManager';
import { LangfuseTreeProvider } from './views/TreeProvider';
import { registerConnectionCommands } from './commands/connection';
import { registerTraceCommands } from './commands/trace';
import { registerFilterCommands } from './commands/filter';

let connectionManager: ConnectionManager;
let treeProvider: LangfuseTreeProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  connectionManager = new ConnectionManager(context);
  await connectionManager.initialize();

  treeProvider = new LangfuseTreeProvider(connectionManager);
  
  const treeView = vscode.window.createTreeView('langfuseExplorer', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(treeView);

  registerConnectionCommands(context, connectionManager, treeProvider);
  registerTraceCommands(context, connectionManager);
  registerFilterCommands(context, treeProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('langfusecode.refresh', () => {
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand('langfusecode.loadOlderTraces', 
      (connectionId: string, fromTime: Date, toTime: Date) => {
        treeProvider.loadOlderTraces(connectionId, fromTime, toTime);
      }
    )
  );
}

export function deactivate(): void {
  connectionManager?.cleanup();
}
