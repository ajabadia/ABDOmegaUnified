/**
 * @jest-environment jsdom
 *
 * Tests for useRackSections hook — mutually exclusive state model.
 */
import { describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useRackSections, type RackSections } from '../useRackSections';

const ALL_KEYS: (keyof RackSections)[] = [
  'identity',
  'essentialIdentity',
  'identityBranding',
  'globalUiSkin',
  'activeConstructionPlane',
  'moduleTaxonomy',
  'physicalEmulationProfile',
  'aestheticsGlobals',
  'aestheticsElements',
  'architecture',
];

describe('useRackSections — initial state', () => {
  it('should start with essentialIdentity defaulting to true, all others to false', () => {
    const { result } = renderHook(() => useRackSections());
    const sections = result.current.rackSections;

    expect(sections.essentialIdentity).toBe(true);
    
    // Check all other keys are false
    ALL_KEYS.forEach(key => {
      if (key !== 'essentialIdentity') {
        expect(sections[key]).toBe(false);
      }
    });
  });

  it('should contain exactly 10 keys', () => {
    const { result } = renderHook(() => useRackSections());
    const keys = Object.keys(result.current.rackSections);
    expect(keys).toHaveLength(10);
  });
});

describe('useRackSections — handleToggleRackSection (exclusive selection)', () => {
  it('should toggle a section to true and set all others to false', () => {
    const { result } = renderHook(() => useRackSections());
    
    act(() => {
      result.current.handleToggleRackSection('globalUiSkin');
    });

    expect(result.current.rackSections.globalUiSkin).toBe(true);
    expect(result.current.rackSections.essentialIdentity).toBe(false);
  });

  it('should toggle the active section to false when clicked again', () => {
    const { result } = renderHook(() => useRackSections());
    
    // essentialIdentity starts as true. Click it again:
    act(() => {
      result.current.handleToggleRackSection('essentialIdentity');
    });
    
    expect(result.current.rackSections.essentialIdentity).toBe(false);
    
    // Ensure all keys are false now
    ALL_KEYS.forEach(key => {
      expect(result.current.rackSections[key]).toBe(false);
    });
  });

  it('should handle an unknown key gracefully (no crash)', () => {
    const { result } = renderHook(() => useRackSections());
    expect(() => {
      act(() => {
        result.current.handleToggleRackSection('nonexistent');
      });
    }).not.toThrow();
    
    // Identity state remains intact
    expect(result.current.rackSections.essentialIdentity).toBe(true);
  });
});

describe('useRackSections — return shape', () => {
  it('should return rackSections and handleToggleRackSection', () => {
    const { result } = renderHook(() => useRackSections());
    expect(result.current).toHaveProperty('rackSections');
    expect(result.current).toHaveProperty('handleToggleRackSection');
    expect(typeof result.current.handleToggleRackSection).toBe('function');
  });
});
