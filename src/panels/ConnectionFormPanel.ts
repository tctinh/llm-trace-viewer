import * as vscode from 'vscode';
import { ConnectionConfig } from '../types';
import { LangfuseClient } from '../core/LangfuseClient';

export class ConnectionFormPanel {
  private static panels = new Map<string, ConnectionFormPanel>();
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private extensionUri: vscode.Uri,
    private existingConfig: ConnectionConfig | undefined,
    private onSave: (config: ConnectionConfig, secretKey: string) => Promise<void>
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this.disposables
    );
  }

  static show(
    extensionUri: vscode.Uri,
    existingConfig: ConnectionConfig | undefined,
    onSave: (config: ConnectionConfig, secretKey: string) => Promise<void>
  ): void {
    const key = existingConfig?.id || 'new';
    const existing = this.panels.get(key);
    if (existing) {
      existing.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'langfuseConnectionForm',
      existingConfig ? `Edit: ${existingConfig.name}` : 'New Langfuse Connection',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const formPanel = new ConnectionFormPanel(panel, extensionUri, existingConfig, onSave);
    this.panels.set(key, formPanel);
  }

  private async handleMessage(message: { command: string; [key: string]: unknown }): Promise<void> {
    switch (message.command) {
      case 'save':
        await this.handleSave(message as { command: string; name: string; url: string; publicKey: string; secretKey: string });
        break;
      case 'test':
        await this.handleTest(message as { command: string; url: string; publicKey: string; secretKey: string });
        break;
      case 'cancel':
        this.panel.dispose();
        break;
    }
  }

  private async handleSave(data: { name: string; url: string; publicKey: string; secretKey: string }): Promise<void> {
    const config: ConnectionConfig = {
      id: this.existingConfig?.id || crypto.randomUUID(),
      name: data.name,
      url: data.url.replace(/\/$/, ''),
      publicKey: data.publicKey
    };

    try {
      await this.onSave(config, data.secretKey);
      this.panel.dispose();
    } catch (error) {
      this.postMessage({
        command: 'error',
        message: error instanceof Error ? error.message : 'Failed to save connection'
      });
    }
  }

  private async handleTest(data: { url: string; publicKey: string; secretKey: string }): Promise<void> {
    this.postMessage({ command: 'testing' });

    try {
      const client = new LangfuseClient(data.url.replace(/\/$/, ''), data.publicKey, data.secretKey);
      const healthy = await client.healthCheck();
      
      this.postMessage({
        command: 'testResult',
        success: healthy,
        message: healthy ? 'Connection successful!' : 'Connection failed'
      });
    } catch (error) {
      this.postMessage({
        command: 'testResult',
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  }

  private postMessage(message: object): void {
    this.panel.webview.postMessage(message);
  }

  private getHtml(): string {
    const config = this.existingConfig;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      box-sizing: border-box;
    }
    input:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .buttons {
      display: flex;
      gap: 8px;
      margin-top: 24px;
    }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .message {
      padding: 8px 12px;
      border-radius: 4px;
      margin-top: 16px;
      display: none;
    }
    .message.success {
      background: var(--vscode-testing-iconPassed);
      color: white;
      display: block;
    }
    .message.error {
      background: var(--vscode-testing-iconFailed);
      color: white;
      display: block;
    }
    .message.testing {
      background: var(--vscode-button-secondaryBackground);
      display: block;
    }
  </style>
</head>
<body>
  <h2>${config ? 'Edit Connection' : 'New Connection'}</h2>
  
  <div class="form-group">
    <label for="name">Connection Name</label>
    <input type="text" id="name" value="${config?.name || ''}" placeholder="My Langfuse Project">
  </div>

  <div class="form-group">
    <label for="url">Langfuse URL</label>
    <input type="text" id="url" value="${config?.url || 'https://cloud.langfuse.com'}" placeholder="https://cloud.langfuse.com">
    <div class="hint">Use https://cloud.langfuse.com for cloud, or your self-hosted URL</div>
  </div>

  <div class="form-group">
    <label for="publicKey">Public Key</label>
    <input type="text" id="publicKey" value="${config?.publicKey || ''}" placeholder="pk-lf-...">
  </div>

  <div class="form-group">
    <label for="secretKey">Secret Key</label>
    <input type="password" id="secretKey" placeholder="sk-lf-...">
    <div class="hint">${config ? 'Leave empty to keep existing key' : 'Your secret key is stored securely'}</div>
  </div>

  <div class="buttons">
    <button class="primary" onclick="save()">Save</button>
    <button class="secondary" onclick="test()">Test Connection</button>
    <button class="secondary" onclick="cancel()">Cancel</button>
  </div>

  <div id="message" class="message"></div>

  <script>
    const vscode = acquireVsCodeApi();

    function save() {
      vscode.postMessage({
        command: 'save',
        name: document.getElementById('name').value,
        url: document.getElementById('url').value,
        publicKey: document.getElementById('publicKey').value,
        secretKey: document.getElementById('secretKey').value
      });
    }

    function test() {
      vscode.postMessage({
        command: 'test',
        url: document.getElementById('url').value,
        publicKey: document.getElementById('publicKey').value,
        secretKey: document.getElementById('secretKey').value
      });
    }

    function cancel() {
      vscode.postMessage({ command: 'cancel' });
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      const el = document.getElementById('message');
      
      if (msg.command === 'testing') {
        el.className = 'message testing';
        el.textContent = 'Testing connection...';
      } else if (msg.command === 'testResult') {
        el.className = 'message ' + (msg.success ? 'success' : 'error');
        el.textContent = msg.message;
      } else if (msg.command === 'error') {
        el.className = 'message error';
        el.textContent = msg.message;
      }
    });
  </script>
</body>
</html>`;
  }

  private dispose(): void {
    const key = this.existingConfig?.id || 'new';
    ConnectionFormPanel.panels.delete(key);
    this.disposables.forEach(d => d.dispose());
  }
}
