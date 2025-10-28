/**
 * Sequential Thinking MCP Server - Cloudflare Workers Edition
 * 
 * This version runs on Cloudflare Workers using Durable Objects for state management.
 * Supports HTTP transport only (SSE + Streamable HTTP).
 */

import { SequentialThinkingDO, type Env } from './durable-object';

// Export Durable Object class
export { SequentialThinkingDO };

/**
 * Main Worker entry point
 * Handles MCP requests and routes to appropriate Durable Object
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        server: 'sequential-thinking-mcp-cloudflare',
        version: '2.0.0',
        transport: 'http',
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // MCP endpoints
    if (url.pathname.startsWith('/mcp')) {
      // Get or create Durable Object ID
      // For now, use a single global state (can be extended to per-user later)
      const id = env.THINKING_STATE.idFromName('global');
      const stub = env.THINKING_STATE.get(id);

      // Forward request to Durable Object
      return await stub.fetch(request);
    }

    // MCP tool endpoints
    if (url.pathname === '/think' || url.pathname === '/sequences/search') {
      const id = env.THINKING_STATE.idFromName('global');
      const stub = env.THINKING_STATE.get(id);
      return await stub.fetch(request);
    }

    // MCP resources endpoint
    if (url.pathname === '/resources') {
      return handleResources(env);
    }

    // MCP tools list endpoint
    if (url.pathname === '/tools') {
      return handleToolsList(env);
    }

    // MCP prompts list endpoint
    if (url.pathname === '/prompts') {
      return handlePromptsList(env);
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    return new Response('Not Found - Sequential Thinking MCP Server (Cloudflare Edition)', { 
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

/**
 * Handle MCP resources list
 */
function handleResources(env: Env): Response {
  const resources = [
    {
      uri: 'sequence://current',
      name: 'Current Sequence',
      description: 'Live current sequence data including active sequence info',
      mimeType: 'application/json'
    },
    {
      uri: 'sequences://library',
      name: 'Sequence Library',
      description: 'Browse all saved sequences with metadata',
      mimeType: 'application/json'
    },
    {
      uri: 'patterns://analysis',
      name: 'Thinking Patterns',
      description: 'Analysis of thinking patterns across sequences',
      mimeType: 'application/json'
    },
    {
      uri: 'verification://status',
      name: 'Verification Status',
      description: 'Real-time verification dashboard',
      mimeType: 'application/json'
    },
    {
      uri: 'thoughts://recent',
      name: 'Recent Thoughts',
      description: 'Recent thoughts across all sequences',
      mimeType: 'application/json'
    }
  ];

  return new Response(JSON.stringify({ resources }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Handle MCP tools list
 */
function handleToolsList(env: Env): Response {
  const tools = [
    {
      name: 'sequentialthinking',
      description: 'Facilitates step-by-step problem-solving with revision, branching, and persistence',
      inputSchema: {
        type: 'object',
        properties: {
          thought: {
            type: 'string',
            description: 'The current thinking step (1-10000 characters)'
          },
          thoughtNumber: {
            type: 'number',
            description: 'The sequential number of this thought (starting from 1)'
          },
          totalThoughts: {
            type: 'number',
            description: 'Estimated total thoughts needed'
          },
          nextThoughtNeeded: {
            type: 'boolean',
            description: 'Whether another thought step is needed'
          },
          thoughtType: {
            type: 'string',
            enum: ['hypothesis', 'verification'],
            description: 'Type of thought for hypothesis testing workflow'
          },
          verificationResult: {
            type: 'string',
            enum: ['confirmed', 'refuted', 'partial', 'pending'],
            description: 'Result of verification (for verification thoughts only)'
          },
          isRevision: {
            type: 'boolean',
            description: 'Whether this revises a previous thought'
          },
          revisesThought: {
            type: 'number',
            description: 'The thought number being revised (if isRevision is true)'
          },
          branchFromThought: {
            type: 'number',
            description: 'Thought number to branch from (creates alternative path)'
          },
          branchId: {
            type: 'string',
            description: 'Identifier for the branch'
          },
          relatedTo: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of thought numbers this relates to or builds upon'
          },
          sequenceId: {
            type: 'string',
            description: 'ID of the sequence to continue (optional)'
          }
        },
        required: ['thought', 'thoughtNumber', 'totalThoughts', 'nextThoughtNeeded']
      }
    }
  ];

  return new Response(JSON.stringify({ tools }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Handle MCP prompts list
 */
function handlePromptsList(env: Env): Response {
  const prompts = [
    {
      name: 'start_analysis',
      description: 'Structured analysis framework for beginning systematic investigation',
      arguments: [
        { name: 'problem', description: 'The problem to analyze', required: true },
        { name: 'context', description: 'Context and constraints', required: false }
      ]
    },
    {
      name: 'hypothesis_verification',
      description: 'Systematic verification template for testing hypotheses',
      arguments: [
        { name: 'hypothesis', description: 'The hypothesis to verify', required: true },
        { name: 'evidence', description: 'Available evidence sources', required: false }
      ]
    },
    {
      name: 'branch_exploration',
      description: 'Alternative perspective template for exploring different approaches',
      arguments: [
        { name: 'original_approach', description: 'The original approach', required: true },
        { name: 'alternative', description: 'Alternative to explore', required: false }
      ]
    }
  ];

  return new Response(JSON.stringify({ prompts }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
