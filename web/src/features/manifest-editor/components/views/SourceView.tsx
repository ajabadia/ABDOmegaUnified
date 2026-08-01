'use client';

/**
 * @purpose Renderiza un componente Editor de Monaco para visualizar y editar el código fuente de manifesto con resaltado sintáctico, diagnósticos y selección.
 * @purpose_en Renders a Monaco Editor component for visualizing and editing manifest source code with syntax highlighting, diagnostics, and selection features.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:3vjki6
 * @lastUpdated 2026-06-15T13:02:13.690Z
 */

import { useEffect, useMemo, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

import type { TabDiagnostics } from '../../types/diagnostics';
import { mapMonacoMarkers } from '../../utils/diagnosticUtils';

interface SourceViewProps {
  tabId: string;
  manifestId: string;
  value: string;
  language?: 'json';
  editorViewState?: unknown | null;
  onChange: (nextValue: string) => void;
  onCaptureViewState: (viewState: unknown) => void;
  onDiagnosticsUpdate?: (diagnostics: TabDiagnostics) => void;
  selectedItemId?: string | null;
}

export function SourceView({
  tabId,
  manifestId,
  value,
  language = 'json',
  editorViewState,
  onChange,
  onCaptureViewState,
  onDiagnosticsUpdate,
  selectedItemId,
}: SourceViewProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const lastModelUriRef = useRef<string | null>(null);
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  
  // Refs to avoid useEffect re-runs when callbacks change
  const onChangeRef = useRef(onChange);
  const onCaptureViewStateRef = useRef(onCaptureViewState);
  const onDiagnosticsUpdateRef = useRef(onDiagnosticsUpdate);

  // Update refs after render to ensure callbacks are always fresh without violating render rules
  useEffect(() => {
    onChangeRef.current = onChange;
    onCaptureViewStateRef.current = onCaptureViewState;
    onDiagnosticsUpdateRef.current = onDiagnosticsUpdate;
  });

  const modelPath = useMemo(
    () => `file:///omega/${manifestId}/${tabId}.${language}`,
    [manifestId, tabId, language]
  );

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      enableSchemaRequest: false,
      schemas: [
        {
          uri: 'https://omega.abd.io/schemas/manifest.json',
          fileMatch: ['*'],
          schema: {
            type: 'object',
            required: ['id', 'metadata'],
            properties: {
              id: { type: 'string' },
              schemaVersion: { type: 'string' },
              metadata: { type: 'object' },
              ui: { type: 'object' },
              modulations: { type: 'array' },
              resources: { type: 'object' }
            }
          }
        }
      ],
    });

    // Initial model setup on mount if refs are ready
    const uri = monaco.Uri.parse(modelPath);
    let model = monaco.editor.getModel(uri);
    if (!model) {
      model = monaco.editor.createModel(value, language, uri);
    }
    editor.setModel(model);
    if (editorViewState) {
      editor.restoreViewState(editorViewState as Monaco.editor.ICodeEditorViewState);
    }
    lastModelUriRef.current = modelPath;
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const uri = monaco.Uri.parse(modelPath);

    // 1. If we are switching MODELS
    if (lastModelUriRef.current && lastModelUriRef.current !== modelPath) {
      // Capture state of the OLD model
      const oldUri = monaco.Uri.parse(lastModelUriRef.current);
      const oldModel = monaco.editor.getModel(oldUri);
      if (oldModel) {
        onCaptureViewStateRef.current(editor.saveViewState());
      }

      // Load/Create NEW model
      let model = monaco.editor.getModel(uri);
      if (!model) {
        model = monaco.editor.createModel(value, language, uri);
      }
      editor.setModel(model);
      
      // Restore state if available for the new model
      if (editorViewState) {
        editor.restoreViewState(editorViewState as Monaco.editor.ICodeEditorViewState);
      }
      
      lastModelUriRef.current = modelPath;
    } else {
      // 2. We are in the SAME model, just checking for external value updates
      const model = editor.getModel();
      if (model && model.getValue() !== value) {
        model.setValue(value);
      }
    }
  }, [modelPath, value, language, editorViewState]); 

  // Handle diagnostics extraction
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const extractMarkers = () => {
      const model = editor.getModel();
      if (!model) return;

      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      const diagnostics = mapMonacoMarkers(markers);

      onDiagnosticsUpdateRef.current?.(diagnostics);
    };

    // Debounced refresh because markers might take a tick to update after model change (monaco timing issue)
    let timeout: NodeJS.Timeout;
    const debouncedRefresh = () => {
      clearTimeout(timeout);
      timeout = setTimeout(extractMarkers, 150);
    };

    const disposable = monaco.editor.onDidChangeMarkers(([uri]) => {
      if (uri.toString() === modelPath) {
        debouncedRefresh();
      }
    });

    // Initial check on mount/model change
    const initialTimeout = setTimeout(extractMarkers, 1000); // 1s wait for schema validation to settle

    return () => {
      disposable.dispose();
      clearTimeout(timeout);
      clearTimeout(initialTimeout);
    };
  }, [modelPath]);

  // Handle unmount capture
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        onCaptureViewStateRef.current(editorRef.current.saveViewState());
      }
    };
  }, []);

  // Handle Selection Highlight (Phase 6.2 / 10.1C Refinement)
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !selectedItemId) {
      decorationsRef.current?.clear();
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const content = model.getValue();
    
    // Robust Regex (Industrial Standard): Escape ID and search for both "id": "val" and id: "val"
    const escapedId = selectedItemId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`"id"\\s*:\\s*"${escapedId}"`, 'g');
    const match = pattern.exec(content);

    if (match) {
      const startPos = model.getPositionAt(match.index);
      const endPos = model.getPositionAt(match.index + match[0].length);
      
      const range = new monaco.Range(
        startPos.lineNumber,
        1, 
        endPos.lineNumber,
        model.getLineMaxColumn(endPos.lineNumber)
      );

      // Apply decoration collection (Aseptic Management)
      if (!decorationsRef.current) {
        decorationsRef.current = editor.createDecorationsCollection();
      }

      decorationsRef.current.set([
        {
          range,
          options: {
            isWholeLine: true,
            className: 'omega-source-selection-highlight',
            linesDecorationsClassName: 'omega-source-selection-gutter',
            marginClassName: 'omega-source-selection-gutter',
            minimap: { color: '#00f2ffaa', position: 1 },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          },
        },
      ]);

      // Reveal in center with industrial precision delay
      const revealTimeout = setTimeout(() => {
        editor.revealRangeInCenterIfOutsideViewport(range, monaco.editor.ScrollType.Smooth);
      }, 50);

      return () => clearTimeout(revealTimeout);
    } else {
      decorationsRef.current?.clear();
    }
  }, [selectedItemId, modelPath]);

  return (
    <div className="h-full w-full overflow-hidden wb-bg">
      <Editor
        height="100%"
        defaultLanguage={language}
        theme="vs-dark"
        onMount={handleMount}
        onChange={(next) => onChangeRef.current(next ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          automaticLayout: true,
          wordWrap: 'on',
          tabSize: 2,
          renderWhitespace: 'selection',
          formatOnPaste: true,
          formatOnType: true,
          padding: { top: 16, bottom: 16 },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'always',
        }}
      />
    </div>
  );
}
