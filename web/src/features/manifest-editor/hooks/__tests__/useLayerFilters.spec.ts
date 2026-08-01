/**
 * @jest-environment jsdom
 *
 * Tests for useLayerFilters hook & getNodeComponentType helper
 *
 * Covers:
 * - getNodeComponentType (9 component types)
 * - COMPONENT_FILTERS constants
 * - useLayerFilters: defaults, type, search, hidden, locked, clear
 * - R1c: propertySearchTerm (bind, meta.value, meta.min/max)
 * - R1c: showAuditIssues (audit issue-based filtering)
 * - R1c: showTemplates (templateRef-based filtering)
 * - R1c: extractAuditNodeIds (audit issue path → node IDs)
 */
import { describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import { useLayerFilters, getNodeComponentType, extractAuditNodeIds } from '../useLayerFilters';
import { COMPONENT_FILTERS } from '../useLayerFilters';

// ── Fixtures ────────────────────────────────────────────────────────────

const mockTree: OmegaNode = {
  id: 'rack_master',
  kind: 'rack',
  layout: { pos: { x: 0, y: 0 } },
  children: [
    {
      id: 'cutoff_knob',
      kind: 'cell',
      cellRef: 'moog_knob_01',
      bind: 'vcf.cutoff',
      layout: { pos: { x: 0, y: 0 } },
      meta: { label: 'Cutoff' },
    },
    {
      id: 'res_knob',
      kind: 'cell',
      cellRef: 'moog_knob_02',
      bind: 'vcf.resonance',
      layout: { pos: { x: 50, y: 0 } },
    },
    {
      id: 'audio_in',
      kind: 'port',
      layout: { pos: { x: 0, y: 100 } },
    },
    {
      id: 'volume_slider',
      kind: 'cell',
      cellRef: 'slider_vertical_01',
      layout: { pos: { x: 100, y: 0 } },
    },
    // R1c fixture: node with numeric meta values for property search
    {
      id: 'filter_knob',
      kind: 'cell',
      cellRef: 'knob_01',
      bind: 'vcf.frequency',
      layout: { pos: { x: 150, y: 0 } },
      meta: { label: 'Filter Freq', value: '440', min: 20, max: 20000, default: 1000 },
    },
    // R1c fixture: node with templateRef for template filter
    {
      id: 'template_group',
      kind: 'container',
      role: 'composite',
      layout: { pos: { x: 200, y: 0 } },
      templateRef: 'bp_vcf_preset_01',
      meta: { label: 'VCF Preset' },
      children: [
        {
          id: 'template_child',
          kind: 'cell',
          cellRef: 'knob',
          layout: { pos: { x: 0, y: 0 } },
        },
      ],
    },
  ],
};

const hiddenIds: string[] = [];
const lockedIds: string[] = [];

// ── getNodeComponentType ────────────────────────────────────────────────

describe('getNodeComponentType', () => {
  it('should return knob for nodes with cellRef=knob or kind=cell', () => {
    const node: OmegaNode = { id: 'k1', kind: 'cell', cellRef: 'knob', layout: { pos: { x: 0, y: 0 } } };
    expect(getNodeComponentType(node)).toBe('knob');
    const fallback: OmegaNode = { id: 'k2', kind: 'cell', layout: { pos: { x: 0, y: 0 } } };
    expect(getNodeComponentType(fallback)).toBe('knob');
  });

  it('should return port for nodes with kind=port', () => {
    const node: OmegaNode = { id: 'p1', kind: 'port', layout: { pos: { x: 0, y: 0 } } };
    expect(getNodeComponentType(node)).toBe('port');
  });

  it('should return container for rack/face/group/container kinds', () => {
    for (const kind of ['rack', 'face', 'group', 'container'] as OmegaNode['kind'][]) {
      expect(getNodeComponentType({ id: 'c1', kind, layout: { pos: { x: 0, y: 0 } } })).toBe('container');
    }
  });

  it('should return slider/button/switch/display/label by cellRef', () => {
    const cases: Array<{ cellRef: string; expected: string }> = [
      { cellRef: 'slider_vertical', expected: 'slider' },
      { cellRef: 'button', expected: 'button' },
      { cellRef: 'push', expected: 'button' },
      { cellRef: 'switch', expected: 'switch' },
      { cellRef: 'display', expected: 'display' },
      { cellRef: 'label', expected: 'label' },
    ];
    for (const { cellRef, expected } of cases) {
      expect(getNodeComponentType({ id: 'x', kind: 'cell', cellRef, layout: { pos: { x: 0, y: 0 } } })).toBe(expected);
    }
  });
});

// ── COMPONENT_FILTERS ───────────────────────────────────────────────────

describe('COMPONENT_FILTERS', () => {
  it('should have 9 filter definitions with expected types', () => {
    expect(COMPONENT_FILTERS).toHaveLength(9);
    const types = COMPONENT_FILTERS.map(f => f.type);
    expect(types.sort()).toEqual(['all', 'button', 'container', 'display', 'knob', 'label', 'port', 'slider', 'switch']);
  });
});

// ── useLayerFilters ────────────────────────────────────────────────────

describe('useLayerFilters', () => {
  it('should start with default filter values', () => {
    const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
    expect(result.current.searchTerm).toBe('');
    expect(result.current.typeFilter).toBe('all');
    expect(result.current.showHidden).toBe(false);
    expect(result.current.showLocked).toBe(false);
    // R1c defaults
    expect(result.current.propertySearchTerm).toBe('');
    expect(result.current.showAuditIssues).toBe(false);
    expect(result.current.showTemplates).toBe(false);
  });

  it('should show all nodes with default filters (totalCount = 8)', () => {
    const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
    // 1 root + 4 original + 2 new R1c + 1 nested child = 8
    expect(result.current.totalCount).toBe(8);
    expect(result.current.visibleCount).toBe(8);
  });

  it('should flatten tree into flatNodeIds', () => {
    const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
    const expected = [
      'rack_master',
      'cutoff_knob',
      'res_knob',
      'audio_in',
      'volume_slider',
      'filter_knob',
      'template_group',
      'template_child',
    ];
    expect(result.current.flatNodeIds).toEqual(expected);
  });

  it('should filter by type', () => {
    const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
    act(() => { result.current.setTypeFilter('knob'); });
    // cutoff_knob, res_knob, filter_knob (3 knobs), template_child (kind=cell → knob fallback)
    expect(result.current.visibleCount).toBe(4);
    act(() => { result.current.setTypeFilter('port'); });
    expect(result.current.visibleCount).toBe(1); // audio_in
    act(() => { result.current.setTypeFilter('slider'); });
    expect(result.current.visibleCount).toBe(1); // volume_slider
    act(() => { result.current.setTypeFilter('container'); });
    // rack_master + template_group (kind=container)
    expect(result.current.visibleCount).toBe(2);
  });

  it('should filter by search term (id or label)', () => {
    const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
    act(() => { result.current.setSearchTerm('cutoff'); });
    // cutoff_knob matches by id+bind; rack_master matches via children.some (has cutoff_knob as child)
    expect(result.current.visibleCount).toBe(2);
    expect(result.current.flatNodeIds).toContain('cutoff_knob');
    expect(result.current.flatNodeIds).toContain('rack_master');
  });

  it('should show hidden-only nodes when showHidden is active', () => {
    const hidden = ['res_knob'];
    const { result } = renderHook(() => useLayerFilters(mockTree, hidden, lockedIds));
    act(() => { result.current.setShowHidden(true); });
    expect(result.current.totalCount).toBe(8);
    expect(result.current.visibleCount).toBe(1);
  });

  it('should show locked-only nodes when showLocked is active', () => {
    const locked = ['audio_in'];
    const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, locked));
    act(() => { result.current.setShowLocked(true); });
    expect(result.current.visibleCount).toBe(1);
  });

  // ── R1c: propertySearchTerm ────────────────────────────────────────

  describe('propertySearchTerm', () => {
    it('should filter nodes by bind attribute', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      act(() => { result.current.setPropertySearchTerm('vcf.frequency'); });
      expect(result.current.visibleCount).toBe(1);
      expect(result.current.flatNodeIds).toContain('filter_knob');
    });

    it('should filter nodes by meta.value (string)', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      act(() => { result.current.setPropertySearchTerm('440'); });
      expect(result.current.visibleCount).toBe(1);
      expect(result.current.flatNodeIds).toContain('filter_knob');
    });

    it('should filter nodes by meta.min (number)', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      act(() => { result.current.setPropertySearchTerm('20'); });
      // filter_knob has meta.min=20, also matches because it's in cutoff_knob's label "Cutoff" via search -- actually no, search is separate
      expect(result.current.visibleCount).toBe(1);
      expect(result.current.flatNodeIds).toContain('filter_knob');
    });

    it('should filter nodes by meta.max (number)', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      act(() => { result.current.setPropertySearchTerm('20000'); });
      expect(result.current.visibleCount).toBe(1);
    });

    it('should return 0 visible when property search matches nothing', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      act(() => { result.current.setPropertySearchTerm('zzz_nonexistent'); });
      expect(result.current.visibleCount).toBe(0);
    });

    it('should work independently of type filter', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      act(() => {
        result.current.setTypeFilter('port');
        result.current.setPropertySearchTerm('vcf.resonance');
      });
      // Should find res_knob even though type filter is port
      // Combined: type=port (audio_in) AND prop search vcf.resonance (res_knob) → no overlap → 0
      expect(result.current.visibleCount).toBe(0);
    });

    it('should work independently of search term', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      act(() => {
        result.current.setSearchTerm('cutoff');
        result.current.setPropertySearchTerm('20000');
      });
      // cutoff_knob matches searchTerm but not propertySearchTerm
      // filter_knob matches propertySearchTerm but not searchTerm
      // No node matches both → 0
      expect(result.current.visibleCount).toBe(0);
    });
  });

  // ── R1c: showAuditIssues ───────────────────────────────────────────

  describe('showAuditIssues', () => {
    it('should show only nodes in auditNodeIds when enabled', () => {
      const auditIds = ['cutoff_knob', 'volume_slider'];
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds, auditIds));
      act(() => { result.current.setShowAuditIssues(true); });
      expect(result.current.visibleCount).toBe(2);
      expect(result.current.flatNodeIds).toContain('cutoff_knob');
      expect(result.current.flatNodeIds).toContain('volume_slider');
    });

    it('should show all nodes when showAuditIssues is disabled', () => {
      const auditIds = ['cutoff_knob'];
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds, auditIds));
      // showAuditIssues starts false → all nodes visible
      expect(result.current.visibleCount).toBe(8);
    });

    it('should show zero nodes when auditNodeIds is empty and filter is active', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds, []));
      act(() => { result.current.setShowAuditIssues(true); });
      expect(result.current.visibleCount).toBe(0);
    });

    it('should default to empty array when auditNodeIds not provided', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      // auditNodeIds defaults to [] → no audit filter, all nodes visible
      expect(result.current.visibleCount).toBe(8);
    });
  });

  // ── R1c: showTemplates ─────────────────────────────────────────────

  describe('showTemplates', () => {
    it('should show only nodes with templateRef when enabled', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      act(() => { result.current.setShowTemplates(true); });
      // template_group has templateRef='bp_vcf_preset_01'
      expect(result.current.visibleCount).toBe(1);
      expect(result.current.flatNodeIds).toContain('template_group');
    });

    it('should show all nodes when showTemplates is disabled', () => {
      const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
      // showTemplates starts false → all nodes visible
      expect(result.current.visibleCount).toBe(8);
    });
  });

  // ── clearAllFilters (with R1c fields) ──────────────────────────────

  it('should clearAllFilters reset everything including R1c filters', () => {
    const { result } = renderHook(() => useLayerFilters(mockTree, hiddenIds, lockedIds));
    act(() => {
      result.current.setSearchTerm('knob');
      result.current.setTypeFilter('port');
      result.current.setShowHidden(true);
      result.current.setShowLocked(true);
      result.current.setPropertySearchTerm('vcf');
      result.current.setShowAuditIssues(true);
      result.current.setShowTemplates(true);
    });
    expect(result.current.searchTerm).toBe('knob');
    expect(result.current.propertySearchTerm).toBe('vcf');
    expect(result.current.showAuditIssues).toBe(true);
    expect(result.current.showTemplates).toBe(true);

    act(() => { result.current.clearAllFilters(); });
    expect(result.current.searchTerm).toBe('');
    expect(result.current.typeFilter).toBe('all');
    expect(result.current.showHidden).toBe(false);
    expect(result.current.showLocked).toBe(false);
    expect(result.current.propertySearchTerm).toBe('');
    expect(result.current.showAuditIssues).toBe(false);
    expect(result.current.showTemplates).toBe(false);
  });

  it('should handle undefined tree', () => {
    const { result } = renderHook(() => useLayerFilters(undefined, [], []));
    expect(result.current.totalCount).toBe(0);
    expect(result.current.visibleCount).toBe(0);
    expect(result.current.flatNodeIds).toEqual([]);
  });
});

// ── extractAuditNodeIds ────────────────────────────────────────────────

describe('extractAuditNodeIds', () => {
  it('should extract node IDs from audit issue paths', () => {
    const issues = [
      { path: '/ui/tree/node/cutoff_knob/color' },
      { path: '/ui/tree/node/volume_slider/bind' },
      { path: '/ui/tree/node/res_knob/style' },
    ];
    const ids = extractAuditNodeIds(issues);
    expect(ids).toEqual(['cutoff_knob', 'volume_slider', 'res_knob']);
  });

  it('should return unique IDs only (deduplicate)', () => {
    const issues = [
      { path: '/ui/tree/node/cutoff_knob/color' },
      { path: '/ui/tree/node/cutoff_knob/label' },
      { path: '/ui/tree/node/cutoff_knob/style.variant' },
    ];
    const ids = extractAuditNodeIds(issues);
    expect(ids).toHaveLength(1);
    expect(ids).toEqual(['cutoff_knob']);
  });

  it('should skip entries without a path', () => {
    const issues = [
      { path: '/ui/tree/node/cutoff_knob/color' },
      { rule: 'some-rule' }, // no path
      { path: '' },
    ];
    const ids = extractAuditNodeIds(issues);
    expect(ids).toEqual(['cutoff_knob']);
  });

  it('should return empty array for empty input', () => {
    expect(extractAuditNodeIds([])).toEqual([]);
  });

  it('should ignore paths that do not match the pattern', () => {
    const issues = [
      { path: '/ui/settings/grid' },
      { path: '/ui/tree/unknown_thing' },
    ];
    const ids = extractAuditNodeIds(issues);
    expect(ids).toEqual([]);
  });

  it('should handle mixed valid/invalid paths', () => {
    const issues: Array<{ path?: string }> = [
      { path: '/ui/tree/node/cutoff_knob/color' },
      { path: '/invalid/path' },
      { path: '/ui/tree/node/' }, // trailing slash, no ID
    ];
    const ids = extractAuditNodeIds(issues);
    expect(ids).toEqual(['cutoff_knob']);
  });
});
