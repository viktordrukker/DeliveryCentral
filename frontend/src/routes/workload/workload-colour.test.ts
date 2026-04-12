import { describe, expect, it } from 'vitest';

// getCellColour and getCellTextColour are module-private in WorkloadMatrixPage.tsx.
// We reproduce the logic here to test the colour thresholds independently.
// If the thresholds change in the component, update here too.

function getCellColour(percent: number): string {
  if (percent === 0) return 'transparent';
  if (percent < 50) return '#bfdbfe';
  if (percent < 80) return '#3b82f6';
  if (percent <= 100) return '#22c55e';
  return '#ef4444';
}

function getCellTextColour(percent: number): string {
  if (percent === 0) return '#9ca3af';
  if (percent < 50) return '#1e40af';
  return '#fff';
}

describe('getCellColour', () => {
  it('returns transparent for 0%', () => {
    expect(getCellColour(0)).toBe('transparent');
  });

  it('returns light blue for under-allocated (1–49%)', () => {
    expect(getCellColour(1)).toBe('#bfdbfe');
    expect(getCellColour(25)).toBe('#bfdbfe');
    expect(getCellColour(49)).toBe('#bfdbfe');
  });

  it('returns medium blue for moderate allocation (50–79%)', () => {
    expect(getCellColour(50)).toBe('#3b82f6');
    expect(getCellColour(65)).toBe('#3b82f6');
    expect(getCellColour(79)).toBe('#3b82f6');
  });

  it('returns green for healthy allocation (80–100%)', () => {
    expect(getCellColour(80)).toBe('#22c55e');
    expect(getCellColour(100)).toBe('#22c55e');
  });

  it('returns red for over-allocated (>100%)', () => {
    expect(getCellColour(101)).toBe('#ef4444');
    expect(getCellColour(150)).toBe('#ef4444');
  });
});

describe('getCellTextColour', () => {
  it('returns grey for 0%', () => {
    expect(getCellTextColour(0)).toBe('#9ca3af');
  });

  it('returns dark blue for under-allocated (1–49%)', () => {
    expect(getCellTextColour(1)).toBe('#1e40af');
    expect(getCellTextColour(49)).toBe('#1e40af');
  });

  it('returns white for 50% and above', () => {
    expect(getCellTextColour(50)).toBe('#fff');
    expect(getCellTextColour(100)).toBe('#fff');
    expect(getCellTextColour(150)).toBe('#fff');
  });
});
