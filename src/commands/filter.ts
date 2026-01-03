import * as vscode from 'vscode';
import { LangfuseTreeProvider } from '../views/TreeProvider';

export function registerFilterCommands(
  context: vscode.ExtensionContext,
  treeProvider: LangfuseTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('langfusecode.searchTraces', async () => {
      const currentQuery = treeProvider.getSearchQuery();
      
      const searchTerm = await vscode.window.showInputBox({
        prompt: 'Search traces by name',
        placeHolder: 'Enter trace name to search...',
        value: currentQuery || ''
      });

      if (searchTerm === undefined) {
        return;
      }

      treeProvider.setSearchQuery(searchTerm || undefined);
    }),

    vscode.commands.registerCommand('langfusecode.clearFilters', () => {
      treeProvider.clearSearch();
      vscode.window.showInformationMessage('Filters cleared');
    })
  );
}
