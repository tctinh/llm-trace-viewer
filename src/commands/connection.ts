import * as vscode from 'vscode';
import { ConnectionManager } from '../core/ConnectionManager';
import { LangfuseTreeProvider } from '../views/TreeProvider';
import { ConnectionFormPanel } from '../panels/ConnectionFormPanel';
import { ConnectionItem } from '../views/TreeItems';

export function registerConnectionCommands(
  context: vscode.ExtensionContext,
  connectionManager: ConnectionManager,
  treeProvider: LangfuseTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('langfusecode.addConnection', () => {
      ConnectionFormPanel.show(
        context.extensionUri,
        undefined,
        async (config, secretKey) => {
          await connectionManager.addConnection(config, secretKey);
          treeProvider.refresh();
        }
      );
    }),

    vscode.commands.registerCommand('langfusecode.editConnection', (item: ConnectionItem) => {
      ConnectionFormPanel.show(
        context.extensionUri,
        item.config,
        async (config, secretKey) => {
          await connectionManager.updateConnection(config, secretKey || undefined);
          treeProvider.refresh();
        }
      );
    }),

    vscode.commands.registerCommand('langfusecode.deleteConnection', async (item: ConnectionItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Delete connection "${item.config.name}"?`,
        { modal: true },
        'Delete'
      );
      if (confirm === 'Delete') {
        await connectionManager.removeConnection(item.config.id);
        treeProvider.refresh();
      }
    }),

    vscode.commands.registerCommand('langfusecode.connect', async (item: ConnectionItem) => {
      try {
        await connectionManager.connect(item.config.id);
        treeProvider.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    vscode.commands.registerCommand('langfusecode.disconnect', (item: ConnectionItem) => {
      connectionManager.disconnect(item.config.id);
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('langfusecode.refresh', () => {
      treeProvider.refresh();
    })
  );
}
