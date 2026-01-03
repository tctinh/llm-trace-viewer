import * as vscode from 'vscode';
import { ConnectionConfig, Trace, Observation } from '../types';

export class ConnectionItem extends vscode.TreeItem {
  constructor(
    public readonly config: ConnectionConfig,
    public readonly isConnected: boolean
  ) {
    super(config.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = isConnected ? 'connection-connected' : 'connection-disconnected';
    this.iconPath = new vscode.ThemeIcon(isConnected ? 'plug' : 'debug-disconnect');
    this.description = new URL(config.url).host;
    this.tooltip = `${config.name}\n${config.url}\nStatus: ${isConnected ? 'Connected' : 'Disconnected'}`;
  }
}

export class TraceItem extends vscode.TreeItem {
  constructor(
    public readonly trace: Trace,
    public readonly connectionId: string,
    public readonly baseUrl: string,
    hasChildren: boolean
  ) {
    super(
      trace.name || trace.id.slice(0, 8),
      hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );
    this.contextValue = 'trace';
    this.iconPath = new vscode.ThemeIcon('symbol-event');
    this.description = formatTimestamp(trace.timestamp);
    this.tooltip = buildTraceTooltip(trace);
    this.command = {
      command: 'langfusecode.viewTrace',
      title: 'View Trace',
      arguments: [this]
    };
  }
}

export class ObservationItem extends vscode.TreeItem {
  constructor(
    public readonly observation: Observation,
    public readonly traceId: string,
    public readonly connectionId: string,
    childCount: number
  ) {
    super(
      observation.name || observation.id.slice(0, 8),
      childCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );
    this.contextValue = 'observation';
    this.iconPath = getObservationIcon(observation.type, observation.level);
    this.description = formatObservationDescription(observation);
    this.tooltip = buildObservationTooltip(observation);
  }
}

export class LoadOlderItem extends vscode.TreeItem {
  constructor(
    public readonly connectionId: string,
    public readonly fromTime: Date,
    public readonly toTime: Date
  ) {
    const timeStr = formatTimeRange(fromTime, toTime);
    super(`Load older traces (${timeStr})`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'loadOlder';
    this.iconPath = new vscode.ThemeIcon('history');
    // Pass dates as ISO strings to avoid serialization issues
    this.command = {
      command: 'langfusecode.loadOlderTraces',
      title: 'Load Older',
      arguments: [connectionId, fromTime.toISOString(), toTime.toISOString()]
    };
  }
}

function formatTimeRange(from: Date, to: Date): string {
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  
  const now = new Date();
  const isToday = (d: Date) => d.toDateString() === now.toDateString();
  
  if (isToday(from) && isToday(to)) {
    return `${formatTime(from)} - ${formatTime(to)}`;
  }
  return `${formatDate(from)} ${formatTime(from)}`;
}

export class MessageItem extends vscode.TreeItem {
  constructor(message: string, icon: string = 'info') {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(icon);
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) { return 'just now'; }
  if (diffMins < 60) { return `${diffMins}m ago`; }
  if (diffHours < 24) { return `${diffHours}h ago`; }
  if (diffDays < 7) { return `${diffDays}d ago`; }
  return date.toLocaleDateString();
}

function getObservationIcon(type: Observation['type'], level: Observation['level']): vscode.ThemeIcon {
  if (level === 'ERROR') { return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground')); }
  if (level === 'WARNING') { return new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground')); }

  switch (type) {
    case 'GENERATION': return new vscode.ThemeIcon('sparkle');
    case 'SPAN': return new vscode.ThemeIcon('symbol-method');
    case 'EVENT': return new vscode.ThemeIcon('symbol-event');
    default: return new vscode.ThemeIcon('circle-outline');
  }
}

function formatObservationDescription(obs: Observation): string {
  const parts: string[] = [];
  
  if (obs.startTime && obs.endTime) {
    const durationMs = new Date(obs.endTime).getTime() - new Date(obs.startTime).getTime();
    parts.push(formatDuration(durationMs));
  }
  
  if (obs.model) { parts.push(obs.model); }
  
  if (obs.usage?.total) { parts.push(`${obs.usage.total} tokens`); }
  
  return parts.join(' · ');
}

function formatDuration(ms: number): string {
  if (ms < 1000) { return `${ms}ms`; }
  if (ms < 60000) { return `${(ms / 1000).toFixed(1)}s`; }
  return `${(ms / 60000).toFixed(1)}m`;
}

function buildTraceTooltip(trace: Trace): string {
  const lines = [
    `ID: ${trace.id}`,
    `Time: ${new Date(trace.timestamp).toLocaleString()}`
  ];
  if (trace.name) { lines.push(`Name: ${trace.name}`); }
  if (trace.userId) { lines.push(`User: ${trace.userId}`); }
  if (trace.sessionId) { lines.push(`Session: ${trace.sessionId}`); }
  if (trace.tags.length > 0) { lines.push(`Tags: ${trace.tags.join(', ')}`); }
  return lines.join('\n');
}

function buildObservationTooltip(obs: Observation): string {
  const lines = [
    `Type: ${obs.type}`,
    `ID: ${obs.id}`
  ];
  if (obs.name) { lines.push(`Name: ${obs.name}`); }
  if (obs.model) { lines.push(`Model: ${obs.model}`); }
  if (obs.usage) {
    const usage = [];
    if (obs.usage.input) { usage.push(`in: ${obs.usage.input}`); }
    if (obs.usage.output) { usage.push(`out: ${obs.usage.output}`); }
    if (usage.length) { lines.push(`Tokens: ${usage.join(', ')}`); }
  }
  if (obs.level !== 'DEFAULT') { lines.push(`Level: ${obs.level}`); }
  return lines.join('\n');
}
