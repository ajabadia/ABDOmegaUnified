import React from 'react';

interface MockSelection {
  type?: string;
  node?: { id?: string; label?: string };
}

export function ComponentEditor(props: Record<string, unknown>) {
  const sel = (props.selection ?? {}) as MockSelection;
  const selNode = sel.node ?? {};
  return React.createElement('div', {
    'data-testid': 'component-editor',
    'data-selection-type': sel.type ?? '',
    'data-selection-id': selNode.id ?? '',
    'data-selection-label': selNode.label ?? '',
    'data-inspector-level': props.inspectorLevel ?? '',
  }, 'ComponentEditor');
}
