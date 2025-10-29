# Sequential Thinking MCP Server - Packages

This directory contains a monorepo with multiple implementations of the Sequential Thinking MCP server.

## 📦 Package Structure

```
packages/
├── core/              # Shared types and utilities
├── node/              # Original Node.js implementation (to be added)
└── cloudflare/        # ✨ NEW: Cloudflare Workers implementation
```

## Packages

### 🔧 `@sequentialthinking/core`
Shared TypeScript types and interfaces used by both implementations.

- Common types (`ThoughtData`, `SequenceRecord`, etc.)
- Shared interfaces
- Validation utilities (future)

### 🖥️ `@sequentialthinking/node` (Coming Soon)
The original Node.js implementation with stdio + HTTP transport.

- stdio transport for local use (Claude Desktop)
- HTTP/Express transport for remote use
- File-based SQLite database
- Docker deployment

### ☁️ `@sequentialthinking/cloudflare` (NEW!)
**Fully working Cloudflare Workers implementation** with Durable Objects.

- HTTP-only transport (SSE + Streamable HTTP)
- Durable Objects with zero-latency SQLite
- Global edge deployment (300+ locations)
- Automatic scaling and hibernation
- Free tier available!

**[📖 Full Documentation →](./cloudflare/README.md)**

## Quick Start

### Cloudflare Deployment (Recommended)

```bash
# From packages directory
cd cloudflare

# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Deploy to Cloudflare Workers
npm run deploy

# Output will show your deployment URL:
# https://sequential-thinking-mcp.<your-subdomain>.workers.dev
```

### Local Development

```bash
# From packages directory
cd cloudflare

# Start local dev server
npm run dev

# Server starts at http://localhost:8787
```

## Architecture Comparison

| Feature | Node.js (Original) | Cloudflare (NEW) |
|---------|-------------------|------------------|
| **Transport** | stdio + HTTP | HTTP only |
| **Database** | SQLite (file) | Durable Objects SQLite |
| **Deployment** | Docker/VPS | One command (`npm run deploy`) |
| **Scaling** | Manual | Automatic (scales to zero) |
| **Global** | Single region | 300+ edge locations |
| **Latency** | Region-specific | <100ms worldwide |
| **Cost** | Server costs ($5-50/mo) | Free tier / $5/mo+ |
| **Hibernation** | No | Yes (auto sleep/wake) |
| **State** | Process memory | Persistent Durable Objects |

## When to Use Which?

### Use **Node.js version** when:
- ✅ You need stdio transport (Claude Desktop local)
- ✅ You want file-based SQLite (easier backups)
- ✅ You need full Node.js ecosystem
- ✅ You prefer Docker deployment
- ✅ You want self-hosting control

### Use **Cloudflare version** when:
- ✅ You want global low latency
- ✅ You need automatic scaling
- ✅ You want zero-ops deployment
- ✅ You prefer free tier / pay-as-you-go
- ✅ You need HTTP-only transport
- ✅ You want built-in OAuth (coming soon)

## Development Workflow

### Building All Packages

```bash
# From packages directory
npm run build
```

### Building Specific Package

```bash
npm run build:core
npm run build:cloudflare
```

### Deploying Cloudflare

```bash
npm run deploy:cloudflare
```

## API Compatibility

Both implementations maintain **100% API compatibility**:

- ✅ Same tool interface (`sequentialthinking`)
- ✅ Same resource URIs (`sequence://current`, etc.)
- ✅ Same prompt templates
- ✅ Same thinking logic
- ✅ Same input/output formats

Only transport and storage differ!

## MCP Client Configuration

### Claude Desktop (Cloudflare Version)

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "url": "https://sequential-thinking-mcp.<your-subdomain>.workers.dev/mcp",
      "transport": "http"
    }
  }
}
```

### Cursor (Cloudflare Version)

```json
{
  "mcp": {
    "servers": [
      {
        "name": "sequential-thinking",
        "url": "https://sequential-thinking-mcp.<your-subdomain>.workers.dev/mcp",
        "transport": "http"
      }
    ]
  }
}
```

## Testing

### Test Cloudflare Deployment

```bash
# Health check
curl https://sequential-thinking-mcp.<your-subdomain>.workers.dev/health

# Process a thought
curl -X POST https://sequential-thinking-mcp.<your-subdomain>.workers.dev/think \
  -H "Content-Type: application/json" \
  -d '{
    "thought": "Testing Cloudflare deployment",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false
  }'

# List resources
curl https://sequential-thinking-mcp.<your-subdomain>.workers.dev/resources

# List tools
curl https://sequential-thinking-mcp.<your-subdomain>.workers.dev/tools
```

## Costs

### Cloudflare (Pay-as-you-go)

**Free Tier (Sufficient for most personal use):**
- 100,000 Worker requests/day
- Durable Objects free tier
- First 1 GB storage free

**Paid Usage:**
- Workers: $5/month + $0.30/million requests
- Durable Objects: $5/month + usage-based
- SQL queries: Same as D1 pricing

**Typical personal usage: FREE** 🎉

### Node.js (Fixed costs)

- VPS: $5-20/month (DigitalOcean, Linode, etc.)
- Or Docker on existing infrastructure

## Roadmap

- [x] ✅ Core shared types package
- [x] ✅ Cloudflare Workers implementation
- [x] ✅ Durable Objects with SQLite
- [x] ✅ HTTP transport (SSE + Streamable HTTP)
- [x] ✅ Full MCP capabilities (tools, resources, prompts)
- [ ] 🚧 Move Node.js implementation to packages/node
- [ ] 🚧 OAuth authentication for Cloudflare
- [ ] 🚧 Per-user Durable Objects
- [ ] 🚧 Shared business logic between implementations
- [ ] 🚧 Integration tests
- [ ] 🚧 Benchmarks

## Contributing

1. Clone the repository
2. Install dependencies: `npm install`
3. Make changes in appropriate package
4. Build: `npm run build`
5. Test: See testing section above
6. Submit PR

## Support

- **Issues**: https://github.com/nalyk/sequentialthinking/issues
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **MCP Spec**: https://modelcontextprotocol.io/
- **Durable Objects**: https://developers.cloudflare.com/durable-objects/

## License

MIT - See root LICENSE file

---

**Choose the implementation that fits your needs best!**

- 🖥️ **Node.js**: Full control, self-hosting, stdio support
- ☁️ **Cloudflare**: Global edge, automatic scaling, free tier

Both provide the same powerful sequential thinking capabilities! 🧠✨
