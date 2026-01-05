import * as vscode from 'vscode';
import { ConnectionManager } from '../core/ConnectionManager';
import { Trace, Observation } from '../types';
import { ConnectionItem, TraceItem, ObservationItem, LoadOlderItem, MessageItem, EnvironmentGroupItem } from './TreeItems';

const WINDOW_MS = 30 * 60 * 1000;

interface TracesWindow {
  traces: Trace[];
  oldestTimestamp: Date;
  newestTimestamp: Date;
  hasMore: boolean;
}

export class LangfuseTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private tracesCache = new Map<string, TracesWindow>();
  private observationsCache = new Map<string, Observation[]>();
  private searchQuery: string | undefined;

  constructor(private connectionManager: ConnectionManager) {
    connectionManager.onDidChange(() => this.refresh());
  }

  refresh(): void {
    this.tracesCache.clear();
    this.observationsCache.clear();
    this._onDidChangeTreeData.fire(undefined);
  }

  setSearchQuery(query: string | undefined): void {
    this.searchQuery = query;
    this.refresh();
  }

  getSearchQuery(): string | undefined {
    return this.searchQuery;
  }

  clearSearch(): void {
    this.searchQuery = undefined;
    this.refresh();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) {
      return this.getConnectionItems();
    }

    if (element instanceof ConnectionItem) {
      return this.getEnvironmentGroups(element.config.id);
    }

    if (element instanceof EnvironmentGroupItem) {
      return this.getTraceItemsForEnvironment(element.connectionId, element.environment);
    }

    if (element instanceof TraceItem) {
      return this.getObservationItems(element.connectionId, element.trace.id, null);
    }

    if (element instanceof ObservationItem) {
      return this.getObservationItems(element.connectionId, element.traceId, element.observation.id);
    }

    return [];
  }

  private getConnectionItems(): vscode.TreeItem[] {
    const configs = this.connectionManager.getConnections();
    if (configs.length === 0) {
      return [new MessageItem('No connections. Click + to add.', 'info')];
    }
    return configs.map((config) => new ConnectionItem(
      config,
      this.connectionManager.isConnected(config.id)
    ));
  }

  private async getTraceItems(connectionId: string): Promise<vscode.TreeItem[]> {
    if (!this.connectionManager.isConnected(connectionId)) {
      try {
        await this.connectionManager.connect(connectionId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Connection failed';
        return [new MessageItem(`Error: ${message}`, 'error')];
      }
    }

    const client = this.connectionManager.getClient(connectionId);
    if (!client) {
      return [new MessageItem('Client not available', 'error')];
    }

    try {
      let window = this.tracesCache.get(connectionId);
      
      const projectId = await client.getProjectId();
      
      if (!window) {
        const now = new Date();
        const thirtyMinsAgo = new Date(now.getTime() - WINDOW_MS);
        
        const response = await client.getTraces({
          fromTimestamp: thirtyMinsAgo.toISOString(),
          toTimestamp: now.toISOString(),
          name: this.searchQuery,
        }, 1, 100);
        
        const tracesWithProjectId = response.data.map(t => ({ ...t, projectId: projectId || undefined }));
        
        window = {
          traces: tracesWithProjectId,
          newestTimestamp: now,
          oldestTimestamp: thirtyMinsAgo,
          hasMore: true,
        };
        this.tracesCache.set(connectionId, window);
      }

      return this.buildTraceTreeItems(connectionId, window!, client.baseUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return [new MessageItem(`Error: ${message}`, 'error')];
    }
  }

  private async getEnvironmentGroups(connectionId: string): Promise<vscode.TreeItem[]> {
    const traceItems = await this.getTraceItems(connectionId);
    
    if (traceItems.length === 1 && traceItems[0] instanceof MessageItem) {
      return traceItems;
    }

    const window = this.tracesCache.get(connectionId);
    if (!window || window.traces.length === 0) {
      return [new MessageItem('No traces in this time window', 'info')];
    }

    const envGroups = new Map<string, Trace[]>();
    for (const trace of window.traces) {
      const env = trace.environment || '(no environment)';
      if (!envGroups.has(env)) {
        envGroups.set(env, []);
      }
      envGroups.get(env)!.push(trace);
    }

    const items: vscode.TreeItem[] = [];
    const sortedEnvs = [...envGroups.keys()].sort((a, b) => {
      if (a === '(no environment)') return 1;
      if (b === '(no environment)') return -1;
      return a.localeCompare(b);
    });

    for (const env of sortedEnvs) {
      const traces = envGroups.get(env)!;
      items.push(new EnvironmentGroupItem(env, connectionId, traces.length));
    }

    if (window.hasMore) {
      const olderEnd = window.oldestTimestamp;
      const olderStart = new Date(olderEnd.getTime() - WINDOW_MS);
      items.push(new LoadOlderItem(connectionId, olderStart, olderEnd));
    }

    return items;
  }

  private async getTraceItemsForEnvironment(connectionId: string, environment: string): Promise<vscode.TreeItem[]> {
    const window = this.tracesCache.get(connectionId);
    if (!window) {
      return [new MessageItem('No traces loaded', 'info')];
    }

    const client = this.connectionManager.getClient(connectionId);
    const baseUrl = client?.baseUrl || '';

    const envKey = environment === '(no environment)' ? null : environment;
    const traces = window.traces.filter(t => (t.environment || null) === envKey);

    if (traces.length === 0) {
      return [new MessageItem('No traces in this environment', 'info')];
    }

    const sortedTraces = [...traces].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sortedTraces.map(trace => new TraceItem(trace, connectionId, baseUrl, true));
  }

  private buildTraceTreeItems(connectionId: string, window: TracesWindow, baseUrl: string): vscode.TreeItem[] {
    const items: vscode.TreeItem[] = [];

    if (window.traces.length === 0) {
      items.push(new MessageItem('No traces in this time window', 'info'));
    } else {
      const sortedTraces = [...window.traces].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      for (const trace of sortedTraces) {
        items.push(new TraceItem(trace, connectionId, baseUrl, true));
      }
    }

    if (window.hasMore) {
      const olderEnd = window.oldestTimestamp;
      const olderStart = new Date(olderEnd.getTime() - WINDOW_MS);
      items.push(new LoadOlderItem(connectionId, olderStart, olderEnd));
    }

    return items;
  }

  async loadOlderTraces(connectionId: string, fromTime: Date, toTime: Date): Promise<void> {
    const client = this.connectionManager.getClient(connectionId);
    if (!client) { return; }

    const window = this.tracesCache.get(connectionId);
    if (!window) { return; }

    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Loading traces from ${formatTimeRange(fromTime, toTime)}...`,
        cancellable: false,
      }, async () => {
        const projectId = await client.getProjectId();
        
        const response = await client.getTraces({
          fromTimestamp: fromTime.toISOString(),
          toTimestamp: toTime.toISOString(),
          name: this.searchQuery,
        }, 1, 100);

        const tracesWithProjectId = response.data.map(t => ({ ...t, projectId: projectId || undefined }));
        window.traces.push(...tracesWithProjectId);
        window.oldestTimestamp = fromTime;
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        window.hasMore = fromTime > oneDayAgo;

        this._onDidChangeTreeData.fire(undefined);
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load older traces: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async getObservationItems(
    connectionId: string,
    traceId: string,
    parentId: string | null
  ): Promise<vscode.TreeItem[]> {
    const cacheKey = `${connectionId}:${traceId}`;
    let observations = this.observationsCache.get(cacheKey);

    if (!observations) {
      const client = this.connectionManager.getClient(connectionId);
      if (!client) {
        return [new MessageItem('Client not available', 'error')];
      }

      try {
        const trace = await client.getTrace(traceId);
        observations = trace.observations || [];
        this.observationsCache.set(cacheKey, observations);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return [new MessageItem(`Error: ${message}`, 'error')];
      }
    }

    // Build set of all observation IDs for quick lookup
    const observationIds = new Set(observations.map(o => o.id));

    const children = observations.filter(obs => {
      const obsParentId = obs.parentObservationId;
      if (parentId === null) {
        // Root level: parent is null, empty, doesn't exist in observations, or equals traceId
        return !obsParentId || obsParentId === traceId || !observationIds.has(obsParentId);
      }
      return obsParentId === parentId;
    });
    
    if (children.length === 0) {
      if (parentId === null) {
        return [new MessageItem('No observations', 'info')];
      }
      return [];
    }

    return children
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .map(obs => {
        const childCount = observations!.filter(o => o.parentObservationId === obs.id).length;
        return new ObservationItem(obs, traceId, connectionId, childCount);
      });
  }
}

function formatTimeRange(from: Date, to: Date): string {
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${formatTime(from)} - ${formatTime(to)}`;
}
