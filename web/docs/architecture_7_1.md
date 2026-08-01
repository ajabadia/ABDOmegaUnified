# OMEGA Multi-Document Architecture (Phase 7.1)

```mermaid
graph TD
    subgraph UI ["UI Layer (Workbench)"]
        WBC["WorkbenchContainer"]
        MTH["MultiTabHeader"]
        WVP["WorkbenchViewport (Rack/Orbital)"]
        SVW["SourceView (Monaco)"]
        WBI["WorkbenchInspector (Docked)"]
    end

    subgraph State ["State Management"]
        UWS["useWorkbenchState (Tabs/Panes)"]
        UDO["useDocumentOrchestrator (Documents)"]
    end

    subgraph Storage ["Document Entities"]
        D1["Document A (Manifest + Hash)"]
        D2["Document B (Manifest + Hash)"]
        D3["Document C (Manifest + Hash)"]
    end

    subgraph Services ["Industrial Services"]
        CBS["ClipboardService (Cross-Doc)"]
        IS["IntegrityService (Hashing)"]
    end

    %% Relationships
    WBC -->|activeTabId| UWS
    UWS -->|activeDocumentId| UDO
    UDO -->|Context Binding| WBC
    WBC -->|Sync| WBI
    WBC -->|Sync| WVP
    WBC -->|Sync| SVW
    
    UDO -->|Manages| D1
    UDO -->|Manages| D2
    UDO -->|Manages| D3
    
    D1 -.->|Dirty Check| IS
    D2 -.->|Dirty Check| IS
    
    WVP -.->|Copy/Paste| CBS
    SVW -.->|JSON Sync| D1
```

## Key Components

1. **Workbench Tabs (UI)**: Represent a "view" of a document. Multiple tabs can point to the same `documentId`.
2. **Document Orchestrator (Orchestration)**: Central registry of all open documents. Maintains a dictionary of independent states.
3. **Active Document Sync**: When a tab is focused, the orchestrator updates `activeDocumentId`. All global-context components (Inspector, Viewports) derive their manifest from this active ID.
4. **Clipboard Service**: External service that survives document switching, allowing entities to be moved between different manifests with ID regeneration.
