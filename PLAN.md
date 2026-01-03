# Implementation Plan: langfusecode

## Overview

**Goal**: Create a VSCode extension to browse and debug Langfuse traces directly within the editor, following the dbvectorcode architectural pattern.

**Scope**: 
- ✅ MVP: Browse traces, view observations, date range filter, search filter
- ✅ Trace detail panel with timeline, input/output, metadata
- ✅ Observation detail with all fields (model, tokens, cost, latency)
- ✅ Open in Langfuse web
- ✅ Multiple connections with self-hosted support
- 🔮 Future: Sessions, Prompts, Datasets, Scores

**Key Decisions**:
| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Client | Raw fetch with Basic Auth | Simple, no extra deps, matches Langfuse REST API |
| UI Pattern | Tree View + Webview Panels | Proven pattern from dbvectorcode |
| Bundler | webpack | Same as dbvectorcode, works well |
| State | EventEmitter pattern | VSCode standard, refresh on changes |
| Tree Structure | Connection → [Traces List] | Flat, simpler (Option A) |
| Observation Display | Parent-child hierarchy | Shows nesting in tree |

---

## Architecture

```
langfusecode/
├── src/
│   ├── extension.ts              # Entry point, register commands
│   ├── types.ts                  # TypeScript interfaces
│   ├── core/
│   │   ├── LangfuseClient.ts     # API client (REST + Basic Auth)
│   │   ├── ConnectionManager.ts  # Multi-connection management
│   │   └── ConnectionStorage.ts  # SecretStorage for credentials
│   ├── views/
│   │   ├── TreeProvider.ts       # Main tree data provider
│   │   └── TreeItems.ts          # Tree item classes
│   ├── panels/
│   │   ├── ConnectionFormPanel.ts # Add/edit connection webview
│   │   ├── TraceDetailPanel.ts    # Trace timeline + details
│   │   └── ObservationPanel.ts    # Observation detail view
│   └── commands/
│       ├── connection.ts         # Add/edit/delete/connect
│       ├── trace.ts              # View, refresh, open in browser
│       └── filter.ts             # Date range, search
├── media/
│   └── icon.svg                  # Extension icon
├── package.json
├── tsconfig.json
└── webpack.config.js
```

---

## Implementation Phases

### Phase 1: Project Scaffolding
- [ ] **1.1** Create project structure (src/, media/, configs)
- [ ] **1.2** Create package.json with langfusecode metadata
- [ ] **1.3** Create tsconfig.json and webpack.config.js
- [ ] **1.4** Define TypeScript types in types.ts
- [ ] **1.5** Create basic extension.ts entry point

**Checkpoint**: Extension activates, shows empty tree view

---

### Phase 2: Core Infrastructure
- [ ] **2.1** `LangfuseClient.ts` - API client
  - Basic Auth with publicKey:secretKey
  - Methods: `getTraces()`, `getTrace(id)`, `getObservations()`, `healthCheck()`
  - Configurable base URL for self-hosted
- [ ] **2.2** `ConnectionStorage.ts` - Secure credential storage
  - Use `vscode.SecretStorage` for API keys
  - Store connection configs in global state
- [ ] **2.3** `ConnectionManager.ts` - Connection lifecycle
  - Multiple connections support
  - Connect/disconnect with health check
  - Event emitter for state changes

**Checkpoint**: Can connect to Langfuse API, health check passes

---

### Phase 3: Tree View
- [ ] **3.1** `TreeItems.ts` - Define tree item types
  - `ProjectItem` (connection) - shows project name, URL
  - `TraceItem` - shows name, timestamp, tags
  - `ObservationItem` - shows type icon, name, duration (with parent-child hierarchy)
- [ ] **3.2** `TreeProvider.ts` - Tree data provider
  - Root: List of connections (ProjectItem)
  - Level 1: TraceItem list (paginated, lazy load)
  - Level 2: ObservationItem list (nested by parent)
- [ ] **3.3** Register tree view in `extension.ts`

**Checkpoint**: Tree shows connections → traces → observations (hierarchical)

---

### Phase 4: Connection Management UI
- [ ] **4.1** `ConnectionFormPanel.ts` - Webview form
  - Fields: Name, URL, Public Key, Secret Key
  - Test connection button
  - Save/Cancel actions
- [ ] **4.2** Connection commands
  - `langfusecode.addConnection`
  - `langfusecode.editConnection`
  - `langfusecode.deleteConnection`
  - `langfusecode.connect` / `langfusecode.disconnect`

**Checkpoint**: Can add, edit, delete, connect/disconnect

---

### Phase 5: Filtering & Search
- [ ] **5.1** Date range filter
  - Quick picks: Last 1h, 6h, 24h, 7d, 30d, Custom
  - Store in workspace state
  - Show in tree view title/badge
- [ ] **5.2** Search filter
  - Input box for trace name/tags search
  - Debounced API calls
- [ ] **5.3** Filter commands
  - `langfusecode.setDateRange`
  - `langfusecode.searchTraces`
  - `langfusecode.clearFilters`

**Checkpoint**: Can filter traces by date and search term

---

### Phase 6: Trace Detail Panel
- [ ] **6.1** `TraceDetailPanel.ts` - Main webview
  - Header: Name, ID, timestamp, tags, session, user
  - Timeline visualization (observations as spans)
  - Metadata section (collapsible JSON)
  - Input/Output sections (formatted JSON/text)
- [ ] **6.2** Timeline component
  - Horizontal timeline with observation spans
  - Color-coded by type (span, generation, event)
  - Click to jump to observation
- [ ] **6.3** "Open in Langfuse" button
  - Construct URL: `{baseUrl}/project/{projectId}/traces/{traceId}`

**Checkpoint**: Double-click trace shows detail panel with timeline

---

### Phase 7: Observation Detail
- [ ] **7.1** Observation section in TraceDetailPanel
  - Type badge (SPAN, GENERATION, EVENT)
  - Timing: start, end, duration
  - For GENERATION: model, usage (tokens), cost
  - Input/Output with syntax highlighting
  - Metadata JSON viewer
- [ ] **7.2** Click observation in timeline → scroll to details

**Checkpoint**: Can view all observation details

---

### Phase 8: Polish & UX
- [ ] **8.1** Status bar item showing connection status
- [ ] **8.2** Auto-refresh option (configurable interval)
- [ ] **8.3** Error handling & user-friendly messages
- [ ] **8.4** Loading states in tree and panels
- [ ] **8.5** Keyboard shortcuts
- [ ] **8.6** Extension icon and marketplace metadata

**Checkpoint**: Production-ready UX

---

## API Reference

### Langfuse REST API
- Base: `/api/public`
- Auth: Basic Auth (publicKey:secretKey)
- Key endpoints:
  - `GET /traces` - List traces with filters
  - `GET /traces/{id}` - Get trace with observations
  - `GET /v2/observations` - List observations
  - `GET /health` - Health check

### Key Type Definitions

See `src/types.ts` for full definitions.
