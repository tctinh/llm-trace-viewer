# LLM Trace Viewer

Browse and debug LLM traces from Langfuse directly in VS Code.

## Features

- **Connect to Langfuse** - Add multiple Langfuse connections with API keys
- **Browse Traces** - View traces with filtering by date range
- **Search** - Search traces by name, user ID, or metadata
- **Trace Details** - Inspect full trace details including inputs, outputs, and timing
- **Open in Browser** - Quick link to view traces in Langfuse web UI

## Installation

1. Install from VS Code Marketplace
2. Click the Langfuse icon in the Activity Bar
3. Add a connection with your Langfuse API credentials

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `llm-trace-viewer.defaultPageSize` | Number of traces per page | 10 |
| `llm-trace-viewer.defaultDateRange` | Default date range filter | 30m |
| `llm-trace-viewer.autoRefreshInterval` | Auto-refresh interval in seconds (0 to disable) | 0 |

## Roadmap

- [ ] LangSmith support
- [ ] Pydantic Logfire support
- [ ] Trace comparison view
- [ ] Export traces

## Requirements

- Langfuse account with API access
- VS Code 1.85.0 or higher

## License

MIT with Commons Clause - Free for personal and non-commercial use. See [LICENSE](LICENSE) for details.
