# Sequential Thinking MCP Server - Cloudflare Edition

A fully-featured MCP server running on Cloudflare Workers with Durable Objects for global, low-latency sequential thinking capabilities.

## Features

- ✅ **Runs on Cloudflare Workers** - Deployed globally to 300+ edge locations
- ✅ **Durable Objects** - Stateful, zero-latency SQLite storage for thoughts
- ✅ **HTTP Transport** - Supports both SSE and Streamable HTTP
- ✅ **Automatic Scaling** - Scales to zero when idle, unlimited when busy
- ✅ **Global Low Latency** - Executes close to your users worldwide
- ✅ **Free Tier Available** - Generous free tier for personal use
- ✅ **Full MCP Implementation** - Tools, Resources, Prompts
- ✅ **Persistent Sequences** - Thoughts saved across sessions

## Architecture

```
┌─────────────────┐
│ MCP Client      │  (Claude, Cursor, etc.)
│ (HTTP requests) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Cloudflare Worker           │
│ - Routing & CORS            │
│ - MCP endpoint handling     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Durable Object              │
│ - State management          │
│ - SQLite database           │
│ - Thought processing logic  │
└─────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+ installed
- Cloudflare account (free tier works!)
- Wrangler CLI: `npm install -g wrangler`

### 1. Authenticate with Cloudflare

```bash
wrangler login
```

### 2. Deploy

```bash
cd packages/cloudflare
npm install
npm run deploy
```

### 3. Test

```bash
# Get deployment URL from output
curl https://sequential-thinking-mcp.<your-subdomain>.workers.dev/health
```

## Development

### Local Development

```bash
# Start local dev server with Durable Objects
npm run dev
```

This starts a local server at `http://localhost:8787` with full Durable Objects support.

### Environment Variables

Configure in `wrangler.toml`:

```toml
[vars]
ENABLE_HATEOAS = "false"          # Enable HATEOAS links (increases response size 3x)
ENABLE_ELICITATION = "false"      # Enable interactive prompts
MAX_THOUGHT_HISTORY = "1000"      # Maximum thoughts to keep
MAX_BRANCHES = "50"               # Maximum branches
MAX_THOUGHTS_PER_BRANCH = "100"   # Maximum thoughts per branch
```

## Usage

### HTTP Endpoints

#### Health Check
```bash
GET /health
```

#### Process Thought
```bash
POST /think
Content-Type: application/json

{
  "thought": "Let me analyze this problem step by step...",
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true
}
```

#### Search Sequences
```bash
POST /sequences/search
Content-Type: application/json

{
  "query": "analysis",
  "limit": 10
}
```

#### MCP Resources
```bash
GET /resources
```

#### MCP Tools List
```bash
GET /tools
```

#### MCP Prompts List
```bash
GET /prompts
```

## MCP Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sequential-thinking-cloudflare": {
      "url": "https://sequential-thinking-mcp.<your-subdomain>.workers.dev/mcp",
      "transport": "http"
    }
  }
}
```

### Cursor

Configure in Cursor settings:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "sequential-thinking-cloudflare",
        "url": "https://sequential-thinking-mcp.<your-subdomain>.workers.dev/mcp",
        "transport": "http"
      }
    ]
  }
}
```

## Differences from Node.js Version

| Feature | Node.js Version | Cloudflare Version |
|---------|-----------------|-------------------|
| **Transport** | stdio + HTTP | HTTP only |
| **Database** | File-based SQLite | Durable Objects SQLite |
| **Scaling** | Manual | Automatic |
| **Deployment** | Docker/VPS | One command |
| **Global** | Single region | 300+ locations |
| **Cost** | Server costs | Free tier / usage-based |
| **State** | Process memory | Durable Objects |
| **Hibernation** | No | Yes (auto sleep/wake) |

## Cost Estimate

### Free Tier (Sufficient for Personal Use)
- **Workers**: 100,000 requests/day
- **Durable Objects**: Free tier available
- **SQL Queries**: Same pricing as D1

### Paid Usage
- **Workers**: $5/month + $0.30/million requests
- **Durable Objects**: $5/month + usage-based
- **Storage**: First 1 GB free

**Typical personal usage**: Stays within free tier! 🎉

## Performance

- **Cold start**: ~10-50ms (Workers)
- **Thought processing**: ~5-20ms (Durable Objects with zero-latency SQLite)
- **Global latency**: <100ms from anywhere in the world
- **Scalability**: Unlimited concurrent requests

## Limitations

### Compared to Node.js Version
1. **No stdio transport** - HTTP only
2. **Durable Objects limits** - 1 GB storage per object
3. **CPU time limits** - 30s per request (sufficient for thinking)
4. **No file system** - All storage in Durable Objects

### Cloudflare-Specific
1. **No npm sqlite3** - Uses Durable Objects SQL API instead
2. **V8 isolates** - Not full Node.js (nodejs_compat helps)
3. **Stateless Workers** - State must be in Durable Objects

## Troubleshooting

### Deployment fails
```bash
# Make sure you're logged in
wrangler login

# Verify wrangler.toml is correct
wrangler whoami
```

### Durable Objects errors
```bash
# Check migrations are applied
wrangler migrations list

# View logs
npm run tail
```

### Local development issues
```bash
# Clear local Durable Objects state
rm -rf .wrangler/state

# Restart dev server
npm run dev
```

## Advanced

### Per-User State

Modify `src/index.ts` to use user-specific Durable Objects:

```typescript
// Instead of global:
const id = env.THINKING_STATE.idFromName('global');

// Use user ID:
const userId = request.headers.get('X-User-ID') || 'anonymous';
const id = env.THINKING_STATE.idFromName(`user-${userId}`);
```

### Custom Domains

Add to `wrangler.toml`:

```toml
routes = [
  { pattern = "mcp.yourdomain.com", zone_name = "yourdomain.com" }
]
```

### Monitoring

Enable observability in `wrangler.toml`:

```toml
[observability]
enabled = true
```

View analytics in Cloudflare dashboard.

## Migration from Node.js Version

The Cloudflare version maintains **API compatibility** with the Node.js version:

1. Same tool interface
2. Same resource URIs
3. Same prompt templates
4. Same thinking logic

Only the **transport** and **storage layer** differ.

## Contributing

See root README for contribution guidelines.

## License

MIT - See LICENSE file

## Support

- GitHub Issues: https://github.com/nalyk/sequentialthinking/issues
- Cloudflare Docs: https://developers.cloudflare.com/workers/
- MCP Spec: https://modelcontextprotocol.io/

---

**Built with ❤️ for the MCP community**  
**Powered by Cloudflare Workers & Durable Objects**
