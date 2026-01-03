import * as vscode from 'vscode';
import { ConnectionConfig } from '../types';
export declare class ConnectionFormPanel {
    private extensionUri;
    private existingConfig;
    private onSave;
    private static panels;
    private readonly panel;
    private disposables;
    private constructor();
    static show(extensionUri: vscode.Uri, existingConfig: ConnectionConfig | undefined, onSave: (config: ConnectionConfig, secretKey: string) => Promise<void>): void;
    private handleMessage;
    private handleSave;
    private handleTest;
    private postMessage;
    private getHtml;
    private dispose;
}
//# sourceMappingURL=ConnectionFormPanel.d.ts.map