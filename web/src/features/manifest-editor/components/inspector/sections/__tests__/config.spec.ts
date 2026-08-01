/**
 * Unit tests for getSectionMeta — section metadata resolver extracted from
 * PropertyPanel.tsx (Fase 4). Pure functions; node environment, no jsdom.
 */
import { describe, it, expect } from '@jest/globals';
import { Info, Layout, Zap, Activity, Box, Cpu, Paintbrush, Layers, Palette, type LucideIcon } from 'lucide-react';
import { getSectionMeta, SECTION_CONFIG, type SectionLevel } from '../config';

// ── Static sections (title/icon independent of isModule) ────────────────

describe('getSectionMeta — static sections', () => {
  const staticCases: Array<[string, string, SectionLevel, LucideIcon]> = [
    ['identity', 'Essential Identity', 'essential', Info],
    ['essentialIdentity', 'Essential Identity', 'essential', Info],
    ['identityBranding', 'Identity Branding', 'essential', Cpu],
    ['moduleTaxonomy', 'Module Taxonomy', 'essential', Box],
    ['globalUiSkin', 'Global UI Skin', 'essential', Paintbrush],
    ['activeConstructionPlane', 'Active Construction Plane', 'essential', Layers],
    ['physicalEmulationProfile', 'Physical Emulation Profile', 'essential', Cpu],
    ['simulation', 'Simulation (Dry-Run)', 'essential', Activity],
    ['aestheticsGlobals', 'Aesthetics Globals', 'essential', Box],
    ['aesthetics', 'Design & Aesthetics', 'advanced', Palette],
    ['aestheticsElements', 'Aesthetics Elements', 'advanced', Palette],
    ['diagnostics', 'Low-Level Registry Role', 'diagnostics', Layers],
  ];

  it.each(staticCases)('resolves %s → %s (level %s, static icon)', (sectionId, title, level, icon) => {
    const meta = getSectionMeta(sectionId, false);
    expect(meta.title).toBe(title);
    expect(meta.level).toBe(level);
    expect(meta.icon).toBe(icon);
  });

  it('returns the same static result regardless of isModule', () => {
    for (const [sectionId] of staticCases) {
      expect(getSectionMeta(sectionId, true)).toEqual(getSectionMeta(sectionId, false));
    }
  });
});

// ── Dynamic section: architecture (title/icon depend on isModule) ──────

describe('getSectionMeta — architecture (dynamic)', () => {
  it('resolves module variant → Architecture / Layout', () => {
    const meta = getSectionMeta('architecture', true);
    expect(meta.title).toBe('Architecture');
    expect(meta.level).toBe('advanced');
    expect(meta.icon).toBe(Layout);
  });

  it('resolves node variant → Logic & Ports / Zap', () => {
    const meta = getSectionMeta('architecture', false);
    expect(meta.title).toBe('Logic & Ports');
    expect(meta.level).toBe('advanced');
    expect(meta.icon).toBe(Zap);
  });

  it('uses iconFor resolver when present', () => {
    const cfg = SECTION_CONFIG.architecture;
    expect(typeof cfg.title).toBe('function');
    expect(typeof cfg.iconFor).toBe('function');
  });
});

// ── Fallback for unknown section ids ───────────────────────────────────

describe('getSectionMeta — unknown section fallback', () => {
  it('returns a safe fallback for unknown ids', () => {
    const meta = getSectionMeta('nonexistent_section', false);
    expect(meta).toEqual({
      title: 'nonexistent_section',
      level: 'essential',
      icon: Info,
    });
  });

  it('falls back for empty string', () => {
    const meta = getSectionMeta('', true);
    expect(meta.title).toBe('');
    expect(meta.level).toBe('essential');
    expect(meta.icon).toBe(Info);
  });

  it('is deterministic for the same unknown id', () => {
    expect(getSectionMeta('bogus', true)).toEqual(getSectionMeta('bogus', false));
  });
});

// ── Invariants over the whole config ───────────────────────────────────

describe('getSectionMeta — config invariants', () => {
  it('covers every section defined in SECTION_CONFIG', () => {
    for (const sectionId of Object.keys(SECTION_CONFIG)) {
      const meta = getSectionMeta(sectionId, true);
      expect(meta.title).toBeTruthy();
      expect(meta.level).toBeTruthy();
      expect(meta.icon).toBeTruthy();
    }
  });

  it('never returns a function title (always resolved to string)', () => {
    for (const sectionId of Object.keys(SECTION_CONFIG)) {
      expect(typeof getSectionMeta(sectionId, true).title).toBe('string');
      expect(typeof getSectionMeta(sectionId, false).title).toBe('string');
    }
  });

  it('validates level values against the SectionLevel union', () => {
    const validLevels = ['essential', 'advanced', 'diagnostics'];
    for (const sectionId of Object.keys(SECTION_CONFIG)) {
      expect(validLevels).toContain(getSectionMeta(sectionId, true).level);
      expect(validLevels).toContain(getSectionMeta(sectionId, false).level);
    }
  });
});
