import * as vscode from 'vscode';
import { ConnectionConfig } from '../types';

const CONNECTIONS_KEY = 'langfusecode.connections';

export class ConnectionStorage {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getConnections(): ConnectionConfig[] {
    return this.context.globalState.get<ConnectionConfig[]>(CONNECTIONS_KEY) || [];
  }

  async saveConnections(connections: ConnectionConfig[]): Promise<void> {
    await this.context.globalState.update(CONNECTIONS_KEY, connections);
  }

  async addConnection(config: ConnectionConfig): Promise<void> {
    const connections = this.getConnections();
    connections.push(config);
    await this.saveConnections(connections);
  }

  async updateConnection(config: ConnectionConfig): Promise<void> {
    const connections = this.getConnections();
    const index = connections.findIndex(c => c.id === config.id);
    if (index !== -1) {
      connections[index] = config;
      await this.saveConnections(connections);
    }
  }

  async removeConnection(id: string): Promise<void> {
    const connections = this.getConnections().filter(c => c.id !== id);
    await this.saveConnections(connections);
  }

  async getSecretKey(connectionId: string): Promise<string | undefined> {
    return this.context.secrets.get(`langfusecode.secret.${connectionId}`);
  }

  async setSecretKey(connectionId: string, secretKey: string): Promise<void> {
    await this.context.secrets.store(`langfusecode.secret.${connectionId}`, secretKey);
  }

  async deleteSecretKey(connectionId: string): Promise<void> {
    await this.context.secrets.delete(`langfusecode.secret.${connectionId}`);
  }
}
