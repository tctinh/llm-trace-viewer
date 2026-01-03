import * as vscode from 'vscode';
import { ConnectionManager } from '../core/ConnectionManager';
import { TraceItem, ObservationItem } from '../views/TreeItems';
import { TraceDetailPanel } from '../panels/TraceDetailPanel';

export function registerTraceCommands(
  context: vscode.ExtensionContext,
  connectionManager: ConnectionManager
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('langfusecode.viewTrace', (item: TraceItem) => {
      TraceDetailPanel.show(item.connectionId, item.trace, connectionManager);
    }),

    vscode.commands.registerCommand('langfusecode.openInBrowser', (item: TraceItem | ObservationItem) => {
      const config = connectionManager.getConnections().find((c) => c.id === item.connectionId);
      if (!config) {
        return;
      }

      let url: string;
      if (item instanceof TraceItem) {
        const projectId = item.trace.projectId || 'default';
        url = `${config.url}/project/${projectId}/traces/${item.trace.id}`;
      } else {
        const projectId = 'default';
        url = `${config.url}/project/${projectId}/traces/${item.observation.traceId}?observation=${item.observation.id}`;
      }

      vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );
}
