export interface ConnectionConfig {
  id: string;
  name: string;
  url: string;
  publicKey: string;
}

export interface TraceFilter {
  fromTimestamp?: string;
  toTimestamp?: string;
  name?: string;
  tags?: string[];
  userId?: string;
  sessionId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Trace {
  id: string;
  name: string | null;
  timestamp: string;
  input: unknown;
  output: unknown;
  metadata: Record<string, unknown>;
  tags: string[];
  userId: string | null;
  sessionId: string | null;
  release: string | null;
  version: string | null;
  public: boolean;
  projectId?: string;
}

export interface TraceWithObservations extends Trace {
  observations: Observation[];
}

export type ObservationType = 'SPAN' | 'GENERATION' | 'EVENT';
export type ObservationLevel = 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';

export interface ObservationUsage {
  input: number | null;
  output: number | null;
  total: number | null;
  unit?: string;
}

export interface Observation {
  id: string;
  traceId: string;
  type: ObservationType;
  name: string | null;
  startTime: string;
  endTime: string | null;
  parentObservationId: string | null;
  input: unknown;
  output: unknown;
  metadata: Record<string, unknown>;
  level: ObservationLevel;
  model: string | null;
  usage: ObservationUsage | null;
  costDetails: Record<string, number> | null;
  statusMessage: string | null;
  completionStartTime: string | null;
  promptId: string | null;
  promptName: string | null;
  promptVersion: number | null;
}

export interface DateRangeOption {
  label: string;
  value: string;
  getRange: () => { from: Date; to: Date };
}

export interface ActiveFilter {
  dateRange?: { from: string; to: string; label: string };
  searchQuery?: string;
}
