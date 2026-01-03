import * as vscode from 'vscode';
import { ConnectionConfig } from '../types';
import { ConnectionStorage } from './ConnectionStorage';
import { LangfuseClient } from './LangfuseClient';

export class ConnectionManager {
  private readonly storage: ConnectionStorage;
  private readonly clients: Map<string, LangfuseClient> = new Map();
  private readonly connectedIds: Set<string> = new Set();
  
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.storage = new ConnectionStorage(context);
  }

  async initialize(): Promise<void> {
  }

  getConnections(): ConnectionConfig[] {
    return this.storage.getConnections();
  }

  async addConnection(config: ConnectionConfig, secretKey: string): Promise<void> {
    await this.storage.addConnection(config);
    await this.storage.setSecretKey(config.id, secretKey);
    this._onDidChange.fire();
  }

  async updateConnection(config: ConnectionConfig, secretKey?: string): Promise<void> {
    await this.storage.updateConnection(config);
    if (secretKey) {
      await this.storage.setSecretKey(config.id, secretKey);
    }
    
    if (this.connectedIds.has(config.id)) {
      await this.disconnect(config.id);
      await this.connect(config.id);
    }
    
    this._onDidChange.fire();
  }

  async removeConnection(id: string): Promise<void> {
    await this.disconnect(id);
    await this.storage.removeConnection(id);
    await this.storage.deleteSecretKey(id);
    this._onDidChange.fire();
  }

  async connect(connectionId: string): Promise<boolean> {
    const config = this.getConnections().find(c => c.id === connectionId);
    if (!config) {
      vscode.window.showErrorMessage(`Connection not found: ${connectionId}`);
      return false;
    }

    const secretKey = await this.storage.getSecretKey(connectionId);
    if (!secretKey) {
      vscode.window.showErrorMessage('Secret key not found. Please edit the connection.');
      return false;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Connecting to ${config.name}...`,
        cancellable: false,
      },
      async () => {
        try {
          const client = new LangfuseClient(config.url, config.publicKey, secretKey);
          const isHealthy = await client.healthCheck();

          if (!isHealthy) {
            vscode.window.showErrorMessage(`Failed to connect to ${config.name}: Health check failed`);
            return false;
          }

          this.clients.set(connectionId, client);
          this.connectedIds.add(connectionId);
          this._onDidChange.fire();
          
          vscode.window.showInformationMessage(`Connected to ${config.name}`);
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to connect to ${config.name}: ${message}`);
          return false;
        }
      }
    );
  }

  async disconnect(connectionId: string): Promise<void> {
    this.clients.delete(connectionId);
    this.connectedIds.delete(connectionId);
    this._onDidChange.fire();
  }

  isConnected(connectionId: string): boolean {
    return this.connectedIds.has(connectionId);
  }

  getClient(connectionId: string): LangfuseClient | undefined {
    return this.clients.get(connectionId);
  }

  getConnectionConfig(connectionId: string): ConnectionConfig | undefined {
    return this.getConnections().find(c => c.id === connectionId);
  }

  cleanup(): void {
    this.clients.clear();
    this.connectedIds.clear();
    this._onDidChange.dispose();
  }
}
