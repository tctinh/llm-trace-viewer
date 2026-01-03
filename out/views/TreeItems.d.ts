import * as vscode from 'vscode';
import { ConnectionConfig, Trace, Observation } from '../types';
export declare class ConnectionItem extends vscode.TreeItem {
    readonly config: ConnectionConfig;
    readonly isConnected: boolean;
    constructor(config: ConnectionConfig, isConnected: boolean);
}
export declare class TraceItem extends vscode.TreeItem {
    readonly trace: Trace;
    readonly connectionId: string;
    readonly baseUrl: string;
    constructor(trace: Trace, connectionId: string, baseUrl: string, hasChildren: boolean);
}
export declare class ObservationItem extends vscode.TreeItem {
    readonly observation: Observation;
    readonly traceId: string;
    readonly connectionId: string;
    constructor(observation: Observation, traceId: string, connectionId: string, childCount: number);
}
export declare class LoadOlderItem extends vscode.TreeItem {
    readonly connectionId: string;
    readonly fromTime: Date;
    readonly toTime: Date;
    constructor(connectionId: string, fromTime: Date, toTime: Date);
}
export declare class MessageItem extends vscode.TreeItem {
    constructor(message: string, icon?: string);
}
//# sourceMappingURL=TreeItems.d.ts.map