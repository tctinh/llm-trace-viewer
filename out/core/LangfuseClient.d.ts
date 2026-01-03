import { Trace, TraceWithObservations, Observation, PaginatedResponse, TraceFilter } from '../types';
interface ProjectInfo {
    id: string;
    name: string;
}
export declare class LangfuseClient {
    readonly baseUrl: string;
    private readonly authHeader;
    private projectId;
    private readonly requestTimeout;
    private readonly retryOptions;
    constructor(baseUrl: string, publicKey: string, secretKey: string);
    private sleep;
    private request;
    healthCheck(): Promise<boolean>;
    getProjects(): Promise<ProjectInfo[]>;
    getProjectId(): Promise<string | null>;
    setProjectId(projectId: string): void;
    getTraces(filter?: TraceFilter, page?: number, limit?: number): Promise<PaginatedResponse<Trace>>;
    getTrace(traceId: string): Promise<TraceWithObservations>;
    getObservations(traceId?: string, page?: number, limit?: number): Promise<PaginatedResponse<Observation>>;
    getObservation(observationId: string): Promise<Observation>;
    getTraceUrl(traceId: string): string;
}
export {};
//# sourceMappingURL=LangfuseClient.d.ts.map