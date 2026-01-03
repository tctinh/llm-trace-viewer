import * as vscode from 'vscode';
import { ConnectionConfig } from '../types';
import { LangfuseClient } from './LangfuseClient';
export declare class ConnectionManager {
    private readonly context;
    private readonly storage;
    private readonly clients;
    private readonly connectedIds;
    private readonly _onDidChange;
    readonly onDidChange: vscode.Event<void>;
    constructor(context: vscode.ExtensionContext);
    initialize(): Promise<void>;
    getConnections(): ConnectionConfig[];
    addConnection(config: ConnectionConfig, secretKey: string): Promise<void>;
    updateConnection(config: ConnectionConfig, secretKey?: string): Promise<void>;
    removeConnection(id: string): Promise<void>;
    connect(connectionId: string): Promise<boolean>;
    disconnect(connectionId: string): Promise<void>;
    isConnected(connectionId: string): boolean;
    getClient(connectionId: string): LangfuseClient | undefined;
    getConnectionConfig(connectionId: string): ConnectionConfig | undefined;
    cleanup(): void;
}
//# sourceMappingURL=ConnectionManager.d.ts.map