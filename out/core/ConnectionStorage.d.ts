import * as vscode from 'vscode';
import { ConnectionConfig } from '../types';
export declare class ConnectionStorage {
    private readonly context;
    constructor(context: vscode.ExtensionContext);
    getConnections(): ConnectionConfig[];
    saveConnections(connections: ConnectionConfig[]): Promise<void>;
    addConnection(config: ConnectionConfig): Promise<void>;
    updateConnection(config: ConnectionConfig): Promise<void>;
    removeConnection(id: string): Promise<void>;
    getSecretKey(connectionId: string): Promise<string | undefined>;
    setSecretKey(connectionId: string, secretKey: string): Promise<void>;
    deleteSecretKey(connectionId: string): Promise<void>;
}
//# sourceMappingURL=ConnectionStorage.d.ts.map