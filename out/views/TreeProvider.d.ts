import * as vscode from 'vscode';
import { ConnectionManager } from '../core/ConnectionManager';
export declare class LangfuseTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private connectionManager;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined>;
    private tracesCache;
    private observationsCache;
    private searchQuery;
    constructor(connectionManager: ConnectionManager);
    refresh(): void;
    setSearchQuery(query: string | undefined): void;
    getSearchQuery(): string | undefined;
    clearSearch(): void;
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem;
    getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]>;
    private getConnectionItems;
    private getTraceItems;
    private buildTraceTreeItems;
    loadOlderTraces(connectionId: string, fromTime: Date, toTime: Date): Promise<void>;
    private getObservationItems;
}
//# sourceMappingURL=TreeProvider.d.ts.map