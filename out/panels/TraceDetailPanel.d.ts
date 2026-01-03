import { Trace } from '../types';
import { ConnectionManager } from '../core/ConnectionManager';
export declare class TraceDetailPanel {
    private connectionId;
    private traceId;
    private connectionManager;
    private static panels;
    private readonly panel;
    private disposables;
    private trace;
    private constructor();
    static show(connectionId: string, trace: Trace, connectionManager: ConnectionManager): void;
    private loadTrace;
    private handleMessage;
    private openInBrowser;
    private getLoadingHtml;
    private getErrorHtml;
    private getHtml;
    private buildObservationTree;
    private renderTreeItem;
    private getTypeIcon;
    private renderDetailContent;
    private renderSection;
    private renderJsonTree;
    private escapeHtml;
    private dispose;
}
//# sourceMappingURL=TraceDetailPanel.d.ts.map