import * as vscode from 'vscode';
import { Trace, Observation, TraceWithObservations } from '../types';
import { ConnectionManager } from '../core/ConnectionManager';

export class TraceDetailPanel {
  private static panels = new Map<string, TraceDetailPanel>();
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private trace: TraceWithObservations | null = null;

  private constructor(
    panel: vscode.WebviewPanel,
    private connectionId: string,
    private traceId: string,
    private connectionManager: ConnectionManager
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getLoadingHtml();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this.disposables
    );
    this.loadTrace();
  }

  static show(
    connectionId: string,
    trace: Trace,
    connectionManager: ConnectionManager,
    _extensionUri: vscode.Uri
  ): void {
    const key = `${connectionId}:${trace.id}`;
    const existing = this.panels.get(key);
    if (existing) {
      existing.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'langfuseTraceDetail',
      `Trace: ${trace.name || trace.id.slice(0, 8)}`,
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const detailPanel = new TraceDetailPanel(panel, connectionId, trace.id, connectionManager);
    this.panels.set(key, detailPanel);
  }

  private async loadTrace(): Promise<void> {
    const client = this.connectionManager.getClient(this.connectionId);
    if (!client) {
      this.panel.webview.html = this.getErrorHtml('Not connected');
      return;
    }

    try {
      this.trace = await client.getTrace(this.traceId);
      this.panel.webview.html = this.getHtml();
    } catch (error) {
      this.panel.webview.html = this.getErrorHtml(
        error instanceof Error ? error.message : 'Failed to load trace'
      );
    }
  }

  private handleMessage(message: { command: string; [key: string]: unknown }): void {
    switch (message.command) {
      case 'openInBrowser':
        this.openInBrowser();
        break;
      case 'refresh':
        this.loadTrace();
        break;
    }
  }

  private openInBrowser(): void {
    const config = this.connectionManager.getConnections().find((c) => c.id === this.connectionId);
    if (config && this.trace) {
      const projectId = this.trace.projectId || 'default';
      const url = `${config.url}/project/${projectId}/traces/${this.trace.id}`;
      vscode.env.openExternal(vscode.Uri.parse(url));
    }
  }

  private getLoadingHtml(): string {
    return `<!DOCTYPE html>
<html><head><style>
body { display: flex; justify-content: center; align-items: center; height: 100vh; 
  font-family: var(--vscode-font-family); color: var(--vscode-foreground); }
</style></head><body>Loading trace...</body></html>`;
  }

  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html><head><style>
body { display: flex; justify-content: center; align-items: center; height: 100vh;
  font-family: var(--vscode-font-family); color: var(--vscode-errorForeground); }
</style></head><body>Error: ${message}</body></html>`;
  }

  private getHtml(): string {
    if (!this.trace) {
      return this.getErrorHtml('No trace data');
    }

    const trace = this.trace;
    const observations = trace.observations || [];

    const traceStart = new Date(trace.timestamp).getTime();
    const traceEnd = observations.length > 0 
      ? Math.max(...observations.map(o => new Date(o.endTime || o.startTime).getTime()))
      : traceStart;
    const traceDuration = ((traceEnd - traceStart) / 1000).toFixed(2);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      overflow: hidden;
    }
    .container { display: flex; height: 100vh; }
    .sidebar {
      width: 320px;
      min-width: 280px;
      border-right: 1px solid var(--vscode-panel-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .sidebar-header {
      padding: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }
    .sidebar-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .sidebar-meta { font-size: 11px; color: var(--vscode-descriptionForeground); }
    .tree { flex: 1; overflow-y: auto; padding: 8px 0; }
    .tree-item { cursor: pointer; user-select: none; }
    .tree-item-header {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      gap: 6px;
    }
    .tree-item-header:hover { background: var(--vscode-list-hoverBackground); }
    .tree-item.selected > .tree-item-header {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }
    .tree-chevron {
      width: 16px;
      text-align: center;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      flex-shrink: 0;
      transition: transform 0.15s;
    }
    .tree-icon {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
    }
    .tree-icon.trace { background: #6366f1; color: white; }
    .tree-icon.span { background: #22c55e; color: white; }
    .tree-icon.generation { background: #3b82f6; color: white; }
    .tree-icon.event { background: #f59e0b; color: white; }
    .tree-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tree-badge {
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .tree-badge.error { background: #ef4444; color: white; }
    .tree-badge.warning { background: #f59e0b; color: white; }
    .tree-duration { font-size: 11px; color: var(--vscode-descriptionForeground); flex-shrink: 0; }
    .tree-children { display: none; }
    .tree-item.expanded > .tree-children { display: block; }
    .tree-item.expanded > .tree-item-header > .tree-chevron { transform: rotate(90deg); }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .main-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-shrink: 0;
    }
    .main-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .main-subtitle { font-size: 11px; color: var(--vscode-descriptionForeground); }
    .badges { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .actions { display: flex; gap: 8px; }
    .btn {
      padding: 5px 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .btn-primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
    .main-content { flex: 1; overflow-y: auto; padding: 16px; }
    
    .section { margin-bottom: 16px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; overflow: hidden; }
    .section-header {
      font-weight: 600;
      font-size: 13px;
      padding: 10px 12px;
      background: var(--vscode-sideBarSectionHeader-background);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
    }
    .section-header:hover { background: var(--vscode-list-hoverBackground); }
    .section-chevron {
      font-size: 10px;
      transition: transform 0.15s;
      color: var(--vscode-descriptionForeground);
    }
    .section.collapsed .section-chevron { transform: rotate(-90deg); }
    .section.collapsed .section-content { display: none; }
    .section-content {
      padding: 12px;
      background: var(--vscode-textCodeBlock-background);
    }
    .empty { color: var(--vscode-descriptionForeground); font-style: italic; }
    
    .model-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .model-info-item { background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 6px; }
    .model-info-label { font-size: 10px; color: var(--vscode-descriptionForeground); text-transform: uppercase; margin-bottom: 4px; }
    .model-info-value { font-weight: 500; }
    
    .depth-0 { padding-left: 12px; }
    .depth-1 { padding-left: 32px; }
    .depth-2 { padding-left: 52px; }
    .depth-3 { padding-left: 72px; }
    .depth-4 { padding-left: 92px; }
    .depth-5 { padding-left: 112px; }
    
    .json-tree { font-family: var(--vscode-editor-font-family); font-size: 12px; line-height: 1.6; }
    .json-node { }
    .json-key { color: #9cdcfe; }
    .json-string { color: #ce9178; }
    .json-number { color: #b5cea8; }
    .json-boolean { color: #569cd6; }
    .json-null { color: #569cd6; }
    .json-bracket { color: var(--vscode-descriptionForeground); }
    .json-toggle {
      cursor: pointer;
      user-select: none;
      display: inline-block;
      width: 14px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-size: 10px;
    }
    .json-toggle:hover { color: var(--vscode-foreground); }
    .json-collapsed > .json-children { display: none; }
    .json-collapsed > .json-toggle { transform: rotate(-90deg); display: inline-block; }
    .json-ellipsis { color: var(--vscode-descriptionForeground); cursor: pointer; }
    .json-children { margin-left: 16px; }
    .json-item-count { color: var(--vscode-descriptionForeground); font-size: 11px; margin-left: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-title">${this.escapeHtml(trace.name || 'Unnamed Trace')}</div>
        <div class="sidebar-meta">${observations.length} observations · ${traceDuration}s</div>
      </div>
      <div class="tree">
        ${this.renderTreeItem('trace', trace.id, trace.name || 'Trace', traceDuration + 's', null, 0, true, this.buildObservationTree(observations, trace.id))}
      </div>
    </div>
    <div class="main">
      <div class="main-header" id="detail-header">
        <div>
          <div class="main-title" id="detail-title">${this.escapeHtml(trace.name || 'Trace')}</div>
          <div class="main-subtitle" id="detail-subtitle">${new Date(trace.timestamp).toLocaleString()}</div>
          <div class="badges" id="detail-badges">
            ${trace.tags?.map(t => `<span class="badge">${this.escapeHtml(t)}</span>`).join('') || ''}
          </div>
        </div>
        <div class="actions">
          <button class="btn" onclick="refresh()">↻ Refresh</button>
          <button class="btn btn-primary" onclick="openInBrowser()">↗ Open in Langfuse</button>
        </div>
      </div>
      <div class="main-content" id="detail-content">
        ${this.renderDetailContent('trace', trace)}
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const traceData = ${JSON.stringify(trace)};
    const observations = ${JSON.stringify(observations)};
    const obsMap = new Map(observations.map(o => [o.id, o]));

    function refresh() { vscode.postMessage({ command: 'refresh' }); }
    function openInBrowser() { vscode.postMessage({ command: 'openInBrowser' }); }

    function toggleTree(el, e) {
      e.stopPropagation();
      el.closest('.tree-item').classList.toggle('expanded');
    }

    function toggleSection(el) {
      el.closest('.section').classList.toggle('collapsed');
    }

    function toggleJson(el, e) {
      e.stopPropagation();
      el.closest('.json-node').classList.toggle('json-collapsed');
    }

    function selectItem(type, id) {
      document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
      const item = document.querySelector('[data-id="' + id + '"]');
      if (item) item.classList.add('selected');

      if (type === 'trace') {
        showTraceDetail();
      } else {
        const obs = obsMap.get(id);
        if (obs) showObservationDetail(obs);
      }
    }

    function showTraceDetail() {
      document.getElementById('detail-title').textContent = traceData.name || 'Trace';
      document.getElementById('detail-subtitle').textContent = new Date(traceData.timestamp).toLocaleString();
      document.getElementById('detail-badges').innerHTML = (traceData.tags || [])
        .map(t => '<span class="badge">' + escapeHtml(t) + '</span>').join('');
      document.getElementById('detail-content').innerHTML = renderContent(traceData.input, traceData.output, traceData.metadata);
    }

    function showObservationDetail(obs) {
      document.getElementById('detail-title').textContent = obs.name || obs.type;
      document.getElementById('detail-subtitle').textContent = new Date(obs.startTime).toLocaleString();
      
      const duration = obs.endTime 
        ? ((new Date(obs.endTime) - new Date(obs.startTime)) / 1000).toFixed(2)
        : null;
      
      let badges = '<span class="badge">' + obs.type + '</span>';
      if (duration) badges += '<span class="badge">Latency: ' + duration + 's</span>';
      if (obs.model) badges += '<span class="badge">Model: ' + escapeHtml(obs.model) + '</span>';
      if (obs.usage) {
        const tokens = (obs.usage.input || 0) + (obs.usage.output || 0);
        badges += '<span class="badge">' + tokens + ' tokens</span>';
      }
      if (obs.costDetails) {
        const cost = Object.values(obs.costDetails).reduce((a, b) => a + b, 0);
        if (cost > 0) badges += '<span class="badge">$' + cost.toFixed(6) + '</span>';
      }
      if (obs.level && obs.level !== 'DEFAULT') {
        badges += '<span class="badge" style="background:#ef4444;color:white">' + obs.level + '</span>';
      }
      document.getElementById('detail-badges').innerHTML = badges;

      let html = '';
      if (obs.model || obs.usage) {
        html += '<div class="model-info">';
        if (obs.model) html += '<div class="model-info-item"><div class="model-info-label">Model</div><div class="model-info-value">' + escapeHtml(obs.model) + '</div></div>';
        if (obs.usage) {
          html += '<div class="model-info-item"><div class="model-info-label">Input Tokens</div><div class="model-info-value">' + (obs.usage.input || 0) + '</div></div>';
          html += '<div class="model-info-item"><div class="model-info-label">Output Tokens</div><div class="model-info-value">' + (obs.usage.output || 0) + '</div></div>';
        }
        if (duration) html += '<div class="model-info-item"><div class="model-info-label">Duration</div><div class="model-info-value">' + duration + 's</div></div>';
        if (obs.costDetails) {
          const cost = Object.values(obs.costDetails).reduce((a, b) => a + b, 0);
          html += '<div class="model-info-item"><div class="model-info-label">Cost</div><div class="model-info-value">$' + cost.toFixed(6) + '</div></div>';
        }
        html += '</div>';
      }
      html += renderContent(obs.input, obs.output, obs.metadata);
      document.getElementById('detail-content').innerHTML = html;
    }

    function renderContent(input, output, metadata) {
      let html = '';
      html += renderSection('Input', input);
      html += renderSection('Output', output);
      if (metadata && Object.keys(metadata).length > 0) {
        html += renderSection('Metadata', metadata);
      }
      return html;
    }

    function renderSection(title, data) {
      const hasData = data !== null && data !== undefined;
      return '<div class="section">' +
        '<div class="section-header" onclick="toggleSection(this)">' +
          '<span class="section-chevron">▼</span>' +
          '<span>' + title + '</span>' +
        '</div>' +
        '<div class="section-content">' +
          (hasData ? '<div class="json-tree">' + renderJsonTree(data, 0) + '</div>' : '<div class="empty">No ' + title.toLowerCase() + '</div>') +
        '</div>' +
      '</div>';
    }

    function renderJsonTree(value, depth) {
      if (value === null) return '<span class="json-null">null</span>';
      if (value === undefined) return '<span class="json-null">undefined</span>';
      
      const type = typeof value;
      if (type === 'string') {
        const escaped = escapeHtml(value);
        if (value.length > 500) {
          return '<span class="json-string">"' + escaped.slice(0, 500) + '..."</span>';
        }
        return '<span class="json-string">"' + escaped + '"</span>';
      }
      if (type === 'number') return '<span class="json-number">' + value + '</span>';
      if (type === 'boolean') return '<span class="json-boolean">' + value + '</span>';
      
      if (Array.isArray(value)) {
        if (value.length === 0) return '<span class="json-bracket">[]</span>';
        const collapsed = depth > 1 ? ' json-collapsed' : '';
        let html = '<span class="json-node' + collapsed + '">';
        html += '<span class="json-toggle" onclick="toggleJson(this, event)">▼</span>';
        html += '<span class="json-bracket">[</span>';
        html += '<span class="json-item-count">' + value.length + ' items</span>';
        html += '<span class="json-children">';
        value.forEach((item, i) => {
          html += '<div>' + renderJsonTree(item, depth + 1);
          if (i < value.length - 1) html += ',';
          html += '</div>';
        });
        html += '</span>';
        html += '<span class="json-bracket">]</span>';
        html += '</span>';
        return html;
      }
      
      if (type === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) return '<span class="json-bracket">{}</span>';
        const collapsed = depth > 1 ? ' json-collapsed' : '';
        let html = '<span class="json-node' + collapsed + '">';
        html += '<span class="json-toggle" onclick="toggleJson(this, event)">▼</span>';
        html += '<span class="json-bracket">{</span>';
        html += '<span class="json-item-count">' + keys.length + ' keys</span>';
        html += '<span class="json-children">';
        keys.forEach((key, i) => {
          html += '<div><span class="json-key">"' + escapeHtml(key) + '"</span>: ' + renderJsonTree(value[key], depth + 1);
          if (i < keys.length - 1) html += ',';
          html += '</div>';
        });
        html += '</span>';
        html += '<span class="json-bracket">}</span>';
        html += '</span>';
        return html;
      }
      
      return '<span>' + escapeHtml(String(value)) + '</span>';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    document.querySelector('.tree-item')?.classList.add('selected');
  </script>
</body>
</html>`;
  }

  private buildObservationTree(observations: Observation[], traceId: string): Map<string | null, Observation[]> {
    const tree = new Map<string | null, Observation[]>();
    tree.set(null, []);

    // Build set of all observation IDs for quick lookup
    const observationIds = new Set(observations.map(o => o.id));

    observations.forEach(obs => {
      // Root if parentObservationId is null, empty, equals traceId, or doesn't exist in observations
      const parentId = (!obs.parentObservationId || obs.parentObservationId === traceId || !observationIds.has(obs.parentObservationId))
        ? null
        : obs.parentObservationId;
      if (!tree.has(parentId)) {
        tree.set(parentId, []);
      }
      tree.get(parentId)!.push(obs);
    });

    tree.forEach(children => {
      children.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    return tree;
  }

  private renderTreeItem(
    type: 'trace' | 'span' | 'generation' | 'event',
    id: string,
    name: string,
    duration: string,
    level: string | null,
    depth: number,
    isRoot: boolean,
    tree: Map<string | null, Observation[]>
  ): string {
    const children = isRoot ? tree.get(null) || [] : tree.get(id) || [];
    const hasChildren = children.length > 0;
    const levelLower = level?.toLowerCase();
    const isError = levelLower === 'error';
    const isWarning = levelLower === 'warning';

    let childrenHtml = '';
    if (hasChildren) {
      childrenHtml = '<div class="tree-children">';
      for (const child of children) {
        const childDuration = child.endTime 
          ? ((new Date(child.endTime).getTime() - new Date(child.startTime).getTime()) / 1000).toFixed(2) + 's'
          : '';
        childrenHtml += this.renderTreeItem(
          child.type.toLowerCase() as 'span' | 'generation' | 'event',
          child.id,
          child.name || child.type,
          childDuration,
          child.level,
          depth + 1,
          false,
          tree
        );
      }
      childrenHtml += '</div>';
    }

    return `
      <div class="tree-item${hasChildren ? ' expanded' : ''}" data-id="${id}">
        <div class="tree-item-header depth-${Math.min(depth, 5)}" onclick="selectItem('${type}', '${id}')">
          <span class="tree-chevron" onclick="toggleTree(this, event)">${hasChildren ? '▶' : ''}</span>
          <span class="tree-icon ${type}">${this.getTypeIcon(type)}</span>
          <span class="tree-name">${this.escapeHtml(name)}</span>
          ${isError ? '<span class="tree-badge error">ERROR</span>' : ''}
          ${isWarning ? '<span class="tree-badge warning">WARN</span>' : ''}
          <span class="tree-duration">${duration}</span>
        </div>
        ${childrenHtml}
      </div>
    `;
  }

  private getTypeIcon(type: string): string {
    switch (type) {
      case 'trace': return '⊙';
      case 'span': return '↔';
      case 'generation': return '✦';
      case 'event': return '⚡';
      default: return '○';
    }
  }

  private renderDetailContent(_type: string, data: Trace | Observation): string {
    return `
      ${this.renderSection('Input', data.input)}
      ${this.renderSection('Output', data.output)}
      ${data.metadata && Object.keys(data.metadata).length > 0 ? this.renderSection('Metadata', data.metadata) : ''}
    `;
  }

  private renderSection(title: string, data: unknown): string {
    const hasData = data !== null && data !== undefined;
    return `<div class="section">
      <div class="section-header" onclick="toggleSection(this)">
        <span class="section-chevron">▼</span>
        <span>${title}</span>
      </div>
      <div class="section-content">
        ${hasData ? `<div class="json-tree">${this.renderJsonTree(data, 0)}</div>` : `<div class="empty">No ${title.toLowerCase()}</div>`}
      </div>
    </div>`;
  }

  private renderJsonTree(value: unknown, depth: number): string {
    if (value === null) return '<span class="json-null">null</span>';
    if (value === undefined) return '<span class="json-null">undefined</span>';
    
    const type = typeof value;
    if (type === 'string') {
      const escaped = this.escapeHtml(value as string);
      if ((value as string).length > 500) {
        return `<span class="json-string">"${escaped.slice(0, 500)}..."</span>`;
      }
      return `<span class="json-string">"${escaped}"</span>`;
    }
    if (type === 'number') return `<span class="json-number">${value}</span>`;
    if (type === 'boolean') return `<span class="json-boolean">${value}</span>`;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return '<span class="json-bracket">[]</span>';
      const collapsed = depth > 1 ? ' json-collapsed' : '';
      let html = `<span class="json-node${collapsed}">`;
      html += '<span class="json-toggle" onclick="toggleJson(this, event)">▼</span>';
      html += '<span class="json-bracket">[</span>';
      html += `<span class="json-item-count">${value.length} items</span>`;
      html += '<span class="json-children">';
      value.forEach((item, i) => {
        html += `<div>${this.renderJsonTree(item, depth + 1)}${i < value.length - 1 ? ',' : ''}</div>`;
      });
      html += '</span>';
      html += '<span class="json-bracket">]</span></span>';
      return html;
    }
    
    if (type === 'object') {
      const keys = Object.keys(value as object);
      if (keys.length === 0) return '<span class="json-bracket">{}</span>';
      const collapsed = depth > 1 ? ' json-collapsed' : '';
      let html = `<span class="json-node${collapsed}">`;
      html += '<span class="json-toggle" onclick="toggleJson(this, event)">▼</span>';
      html += '<span class="json-bracket">{</span>';
      html += `<span class="json-item-count">${keys.length} keys</span>`;
      html += '<span class="json-children">';
      keys.forEach((key, i) => {
        html += `<div><span class="json-key">"${this.escapeHtml(key)}"</span>: ${this.renderJsonTree((value as Record<string, unknown>)[key], depth + 1)}${i < keys.length - 1 ? ',' : ''}</div>`;
      });
      html += '</span>';
      html += '<span class="json-bracket">}</span></span>';
      return html;
    }
    
    return `<span>${this.escapeHtml(String(value))}</span>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private dispose(): void {
    const key = `${this.connectionId}:${this.traceId}`;
    TraceDetailPanel.panels.delete(key);
    this.disposables.forEach(d => d.dispose());
  }
}
