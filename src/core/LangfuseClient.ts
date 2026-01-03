import {
  Trace,
  TraceWithObservations,
  Observation,
  PaginatedResponse,
  TraceFilter,
} from '../types';

interface ProjectInfo {
  id: string;
  name: string;
}

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
}

export class LangfuseClient {
  readonly baseUrl: string;
  private readonly authHeader: string;
  private projectId: string | null = null;
  private readonly requestTimeout: number = 60000;
  private readonly retryOptions: RetryOptions = { maxRetries: 2, baseDelayMs: 1000 };

  constructor(baseUrl: string, publicKey: string, secretKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/public${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.retryOptions.baseDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (response.status === 500 || response.status === 502 || response.status === 503) {
          const errorText = await response.text().catch(() => 'Server error');
          lastError = new Error(`Server error (${response.status}): ${errorText.slice(0, 200)}`);
          if (attempt < this.retryOptions.maxRetries) {
            continue;
          }
          throw lastError;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Langfuse API error (${response.status}): ${errorText.slice(0, 200)}`);
        }

        return response.json() as Promise<T>;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error(`Request timeout after ${this.requestTimeout / 1000}s - try reducing page size or date range`);
          if (attempt < this.retryOptions.maxRetries) {
            continue;
          }
          throw lastError;
        }
        
        if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
          lastError = error;
          if (attempt < this.retryOptions.maxRetries) {
            continue;
          }
        }
        
        throw error;
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.request<{ status: string } | { version: string }>('/health');
      return 'status' in result || 'version' in result;
    } catch {
      return false;
    }
  }

  async getProjects(): Promise<ProjectInfo[]> {
    try {
      const result = await this.request<{ data: ProjectInfo[] }>('/projects');
      return result.data || [];
    } catch {
      return [];
    }
  }

  async getProjectId(): Promise<string | null> {
    if (this.projectId) {
      return this.projectId;
    }
    
    const projects = await this.getProjects();
    if (projects.length > 0) {
      this.projectId = projects[0].id;
    }
    return this.projectId;
  }

  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }

  async getTraces(
    filter?: TraceFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Trace>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(Math.min(limit, 50)));

    if (filter?.fromTimestamp) {
      params.set('fromTimestamp', filter.fromTimestamp);
    }
    if (filter?.toTimestamp) {
      params.set('toTimestamp', filter.toTimestamp);
    }
    if (filter?.name) {
      params.set('name', filter.name);
    }
    if (filter?.userId) {
      params.set('userId', filter.userId);
    }
    if (filter?.sessionId) {
      params.set('sessionId', filter.sessionId);
    }
    if (filter?.tags && filter.tags.length > 0) {
      filter.tags.forEach(tag => params.append('tags', tag));
    }

    return this.request<PaginatedResponse<Trace>>(`/traces?${params.toString()}`);
  }

  async getTrace(traceId: string): Promise<TraceWithObservations> {
    return this.request<TraceWithObservations>(`/traces/${traceId}`);
  }

  async getObservations(
    traceId?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<Observation>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(Math.min(limit, 100)));

    if (traceId) {
      params.set('traceId', traceId);
    }

    return this.request<PaginatedResponse<Observation>>(`/observations?${params.toString()}`);
  }

  async getObservation(observationId: string): Promise<Observation> {
    return this.request<Observation>(`/observations/${observationId}`);
  }

  getTraceUrl(traceId: string): string {
    const projectPath = this.projectId ? `/project/${this.projectId}` : '';
    return `${this.baseUrl}${projectPath}/traces/${traceId}`;
  }
}
