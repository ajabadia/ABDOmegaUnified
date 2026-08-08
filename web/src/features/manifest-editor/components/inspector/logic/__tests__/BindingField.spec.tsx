/**
 * @jest-environment jsdom
 *
 * Tests for BindingField — canonical bind select + editable Param Spec
 * (bloque `params:` del .acemm) cuando el bind coincide con paramSpecs.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { BindingField } from '../BindingField';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import type { OmegaParamSpec } from '@/omega-ui-core/types/contract';

function makeNode(overrides?: Partial<OmegaNode>): OmegaNode {
  return {
    id: 'knob-1',
    kind: 'cell',
    cellRef: 'knob',
    layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
    ...overrides,
  } as OmegaNode;
}

const SPECS: Record<string, OmegaParamSpec> = {
  timebase: {
    label: 'Time/Div',
    min: 0.1,
    max: 10,
    default: 1,
    exponent: 1,
    units: 'x',
  },
  mode: {
    label: 'Mode',
    min: 0,
    max: 3,
    default: 0,
    choices: [
      { label: 'Scope', value: 0 },
      { label: 'XY', value: 2 },
    ],
  },
};

describe('BindingField', () => {
  it('renderiza bind options desde availableBinds', () => {
    render(
      <BindingField
        item={makeNode()}
        availableBinds={['timebase', 'gain', 'audio_in']}
        isHighlighted={() => false}
        onUpdate={() => {}}
      />
    );
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toEqual(['-- UNBOUND (Static) --', 'timebase', 'gain', 'audio_in']);
  });

  it('muestra la Param Spec editable cuando el bind coincide con paramSpecs', () => {
    const onUpdateParams = jest.fn();
    render(
      <BindingField
        item={makeNode({ bind: 'timebase' })}
        availableBinds={['timebase']}
        isHighlighted={() => false}
        onUpdate={() => {}}
        paramSpecs={SPECS}
        onUpdateParams={onUpdateParams}
      />
    );
    expect(screen.getByText('Param Spec · timebase')).toBeTruthy();
    expect(screen.getByText('Time/Div')).toBeTruthy();
    // min 0.1 / max 10 / default 1 / exponent 1 / units x
    const min = screen.getByDisplayValue('0.1');
    expect(min).toBeTruthy();
    expect(screen.getByDisplayValue('10')).toBeTruthy();
    expect(screen.getAllByDisplayValue('1').length).toBe(2); // default + exponent
    expect(screen.getByDisplayValue('x')).toBeTruthy();

    fireEvent.change(min, { target: { value: '0.5' } });
    expect(onUpdateParams).toHaveBeenCalledWith('timebase', { min: 0.5 });
  });

  it('muestra choices como chips cuando la spec los define', () => {
    render(
      <BindingField
        item={makeNode({ bind: 'mode' })}
        availableBinds={['mode']}
        isHighlighted={() => false}
        onUpdate={() => {}}
        paramSpecs={SPECS}
        onUpdateParams={() => {}}
      />
    );
    expect(screen.getByText('Scope = 0')).toBeTruthy();
    expect(screen.getByText('XY = 2')).toBeTruthy();
  });

  it('no muestra la Param Spec para binds sin spec', () => {
    render(
      <BindingField
        item={makeNode({ bind: 'audio_in' })}
        availableBinds={['audio_in']}
        isHighlighted={() => false}
        onUpdate={() => {}}
        paramSpecs={SPECS}
        onUpdateParams={() => {}}
      />
    );
    expect(screen.queryByText(/Param Spec/)).toBeNull();
  });

  it('marca la spec como read-only cuando no hay onUpdateParams', () => {
    render(
      <BindingField
        item={makeNode({ bind: 'timebase' })}
        availableBinds={['timebase']}
        isHighlighted={() => false}
        onUpdate={() => {}}
        paramSpecs={SPECS}
      />
    );
    expect(screen.getByText(/Spec read-only/)).toBeTruthy();
    // inputs deshabilitados
    const min = screen.getByDisplayValue('0.1') as HTMLInputElement;
    expect(min.disabled).toBe(true);
  });

  it('actualiza el bind al cambiar la selección', () => {
    const onUpdate = jest.fn();
    render(
      <BindingField
        item={makeNode({ bind: '' })}
        availableBinds={['timebase']}
        isHighlighted={() => false}
        onUpdate={onUpdate}
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'timebase' } });
    expect(onUpdate).toHaveBeenCalledWith({ bind: 'timebase' });
  });
});
