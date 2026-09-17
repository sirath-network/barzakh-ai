/**
 * KeeperHub Client
 * 
 * Communicates with KeeperHub platform via MCP Server and REST API.
 * MCP is the primary path; REST is the fallback.
 * 
 * @see https://docs.keeperhub.com/agent/mcp-server
 * @see https://docs.keeperhub.com/api
 */

import type {
  KeeperHubClientConfig,
  KeeperHubWorkflow,
  KeeperHubExecution,
  KeeperHubApiResponse,
  KeeperHubAuditTrail,
  WorkflowPreview,
} from './keeperhub-types';

const DEFAULT_MCP_ENDPOINT = 'https://app.keeperhub.com/mcp';
const DEFAULT_API_ENDPOINT = 'https://app.keeperhub.com/api';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

export class KeeperHubClient {
  private mcpEndpoint: string;
  private apiEndpoint: string;
  private apiKey?: string;
  private accessToken?: string;

  constructor(config?: Partial<KeeperHubClientConfig>) {
    this.mcpEndpoint = config?.mcpEndpoint || process.env.KEEPERHUB_MCP_ENDPOINT || DEFAULT_MCP_ENDPOINT;
    this.apiEndpoint = config?.apiEndpoint || process.env.KEEPERHUB_API_ENDPOINT || DEFAULT_API_ENDPOINT;
    this.apiKey = config?.apiKey || process.env.KEEPERHUB_API_KEY;
    this.accessToken = config?.accessToken || process.env.KEEPERHUB_ACCESS_TOKEN;
  }

  // === Auth ===
  
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'BarzakhAI/1.0',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    } else if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  // === Retry Logic ===
  
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retries: number = MAX_RETRIES
  ): Promise<KeeperHubApiResponse<T>> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: { ...this.getHeaders(), ...(options.headers || {}) },
          signal: AbortSignal.timeout(30000),
        });

        if (response.status === 401) {
          return { success: false, error: 'Unauthorized. Please check your KeeperHub API key or access token.' };
        }

        if (response.status === 402) {
          return { success: false, error: 'Payment required. The workflow execution requires payment via x402 or MPP.' };
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
          if (attempt < retries) {
            await this.delay(retryAfter * 1000);
            continue;
          }
          return { success: false, error: 'Rate limited by KeeperHub API. Try again later.' };
        }

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          if (attempt < retries && response.status >= 500) {
            await this.delay(INITIAL_RETRY_DELAY * Math.pow(2, attempt));
            continue;
          }
          return { success: false, error: `KeeperHub API error (${response.status}): ${errorBody}` };
        }

        const data = await response.json() as T;
        return { success: true, data };
      } catch (error: any) {
        lastError = error;
        if (attempt < retries) {
          await this.delay(INITIAL_RETRY_DELAY * Math.pow(2, attempt));
          continue;
        }
      }
    }

    return {
      success: false,
      error: `KeeperHub API request failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === MCP Server Methods ===
  
  async mcpCallTool(toolName: string, args: Record<string, any>): Promise<KeeperHubApiResponse<any>> {
    return this.fetchWithRetry(`${this.mcpEndpoint}`, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
    });
  }

  async mcpListTools(): Promise<KeeperHubApiResponse<any>> {
    return this.fetchWithRetry(`${this.mcpEndpoint}`, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {},
      }),
    });
  }

  // === REST API Methods ===
  
  async listWorkflows(): Promise<KeeperHubApiResponse<KeeperHubWorkflow[]>> {
    return this.fetchWithRetry(`${this.apiEndpoint}/workflows`, {
      method: 'GET',
    });
  }

  async getWorkflow(idOrSlug: string): Promise<KeeperHubApiResponse<KeeperHubWorkflow>> {
    return this.fetchWithRetry(`${this.apiEndpoint}/workflows/${idOrSlug}`, {
      method: 'GET',
    });
  }

  async createWorkflow(workflow: KeeperHubWorkflow): Promise<KeeperHubApiResponse<KeeperHubWorkflow>> {
    return this.fetchWithRetry(`${this.apiEndpoint}/workflows`, {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async executeWorkflow(
    workflowId: string,
    inputs?: Record<string, any>,
    dryRun: boolean = false
  ): Promise<KeeperHubApiResponse<KeeperHubExecution>> {
    const endpoint = dryRun
      ? `${this.apiEndpoint}/workflows/${workflowId}/dry-run`
      : `${this.apiEndpoint}/workflows/${workflowId}/execute`;
    
    return this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: JSON.stringify({ inputs, dryRun }),
    });
  }

  async callListedWorkflow(
    slug: string,
    inputs?: Record<string, any>
  ): Promise<KeeperHubApiResponse<KeeperHubExecution>> {
    return this.fetchWithRetry(`${this.apiEndpoint}/mcp/workflows/${slug}/call`, {
      method: 'POST',
      body: JSON.stringify(inputs || {}),
    });
  }

  async getExecution(executionId: string): Promise<KeeperHubApiResponse<KeeperHubExecution>> {
    return this.fetchWithRetry(`${this.apiEndpoint}/executions/${executionId}`, {
      method: 'GET',
    });
  }

  async getAuditTrail(executionId: string): Promise<KeeperHubApiResponse<KeeperHubAuditTrail>> {
    return this.fetchWithRetry(`${this.apiEndpoint}/executions/${executionId}/audit`, {
      method: 'GET',
    });
  }

  async listExecutions(workflowId?: string, limit?: number): Promise<KeeperHubApiResponse<KeeperHubExecution[]>> {
    const params = new URLSearchParams();
    if (workflowId) params.set('workflowId', workflowId);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    
    return this.fetchWithRetry(`${this.apiEndpoint}/executions${qs}`, {
      method: 'GET',
    });
  }

  // === Convenience: MCP-first with REST fallback ===
  
  async executeWorkflowMCPFirst(
    workflowSlug: string,
    inputs?: Record<string, any>,
    dryRun: boolean = false
  ): Promise<KeeperHubApiResponse<KeeperHubExecution>> {
    // Try MCP first
    if (this.accessToken) {
      const mcpResult = await this.mcpCallTool(
        dryRun ? 'dry_run_workflow' : 'run_workflow',
        { slug: workflowSlug, inputs: inputs || {} }
      );
      if (mcpResult.success) return mcpResult;
      console.warn('[KeeperHub] MCP call failed, falling back to REST:', mcpResult.error);
    }
    
    // Fallback to REST
    return this.executeWorkflow(workflowSlug, inputs, dryRun);
  }
}

// Singleton instance
let _client: KeeperHubClient | null = null;

export function getKeeperHubClient(): KeeperHubClient {
  if (!_client) {
    _client = new KeeperHubClient();
  }
  return _client;
}

export function createKeeperHubClient(config: Partial<KeeperHubClientConfig>): KeeperHubClient {
  return new KeeperHubClient(config);
}
