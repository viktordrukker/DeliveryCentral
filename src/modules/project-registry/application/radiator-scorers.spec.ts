import {
  capexCompliance,
  changeRequestBurden,
  costPerformanceIndex,
  criticalPathHealth,
  deliverableAcceptance,
  forecastAccuracy,
  keyPersonRisk,
  milestoneAdherence,
  overAllocationRate,
  overallScore,
  overallScoreToBand,
  quadrantScore,
  requirementsStability,
  scopeCreep,
  scoreByThresholds,
  scoreToBand,
  spendRate,
  staffingFillRate,
  teamMood,
  timelineDeviation,
  velocityTrend,
} from './radiator-scorers';

describe('radiator-scorers', () => {
  describe('scoreByThresholds — higher-is-better', () => {
    const t = { t4: 0.9, t3: 0.7, t2: 0.5, t1: 0.3, direction: 'HIGHER_IS_BETTER' as const };
    it.each([
      [0.9, 4], [0.89, 3], [0.7, 3], [0.69, 2], [0.5, 2], [0.49, 1], [0.3, 1], [0.29, 0],
    ])('value %s → score %s', (v, expected) => expect(scoreByThresholds(v, t)).toBe(expected));
  });

  describe('scoreByThresholds — lower-is-better', () => {
    const t = { t4: 0.1, t3: 0.2, t2: 0.3, t1: 0.5, direction: 'LOWER_IS_BETTER' as const };
    it.each([
      [0.1, 4], [0.11, 3], [0.2, 3], [0.21, 2], [0.3, 2], [0.31, 1], [0.5, 1], [0.51, 0],
    ])('value %s → score %s', (v, expected) => expect(scoreByThresholds(v, t)).toBe(expected));
  });

  // Each scorer: 4 boundary assertions = 16 scorers × 4 = 64 boundary tests
  describe('requirementsStability', () => {
    it('0.95 → 4', () => expect(requirementsStability(0.95)).toBe(4));
    it('0.85 → 3', () => expect(requirementsStability(0.85)).toBe(3));
    it('0.70 → 2', () => expect(requirementsStability(0.7)).toBe(2));
    it('0.50 → 1', () => expect(requirementsStability(0.5)).toBe(1));
  });

  describe('scopeCreep', () => {
    it('0.05 → 4', () => expect(scopeCreep(0.05)).toBe(4));
    it('0.10 → 3', () => expect(scopeCreep(0.1)).toBe(3));
    it('0.20 → 2', () => expect(scopeCreep(0.2)).toBe(2));
    it('0.35 → 1', () => expect(scopeCreep(0.35)).toBe(1));
  });

  describe('deliverableAcceptance', () => {
    it('0.95 → 4', () => expect(deliverableAcceptance(0.95)).toBe(4));
    it('0.85 → 3', () => expect(deliverableAcceptance(0.85)).toBe(3));
    it('0.70 → 2', () => expect(deliverableAcceptance(0.7)).toBe(2));
    it('0.50 → 1', () => expect(deliverableAcceptance(0.5)).toBe(1));
  });

  describe('changeRequestBurden', () => {
    it('0.02 severity/100pts → 4', () => expect(changeRequestBurden(2, 100)).toBe(4));
    it('0.05 severity/100pts → 3', () => expect(changeRequestBurden(5, 100)).toBe(3));
    it('0.10 severity/100pts → 2', () => expect(changeRequestBurden(10, 100)).toBe(2));
    it('0.20 severity/100pts → 1', () => expect(changeRequestBurden(20, 100)).toBe(1));
  });

  describe('milestoneAdherence', () => {
    it('0.95 → 4', () => expect(milestoneAdherence(0.95)).toBe(4));
    it('0.85 → 3', () => expect(milestoneAdherence(0.85)).toBe(3));
    it('0.70 → 2', () => expect(milestoneAdherence(0.7)).toBe(2));
    it('0.50 → 1', () => expect(milestoneAdherence(0.5)).toBe(1));
  });

  describe('timelineDeviation', () => {
    it('2 drift / 100 duration = 0.02 → 4', () => expect(timelineDeviation(2, 100)).toBe(4));
    it('5 drift / 100 duration = 0.05 → 3', () => expect(timelineDeviation(5, 100)).toBe(3));
    it('10 drift / 100 duration = 0.10 → 2', () => expect(timelineDeviation(10, 100)).toBe(2));
    it('20 drift / 100 duration = 0.20 → 1', () => expect(timelineDeviation(20, 100)).toBe(1));
  });

  describe('criticalPathHealth', () => {
    it('10 float days → 4', () => expect(criticalPathHealth(10)).toBe(4));
    it('5 float days → 3', () => expect(criticalPathHealth(5)).toBe(3));
    it('2 float days → 2', () => expect(criticalPathHealth(2)).toBe(2));
    it('0 float days → 1', () => expect(criticalPathHealth(0)).toBe(1));
  });

  describe('velocityTrend', () => {
    it('0.95 → 4', () => expect(velocityTrend(0.95)).toBe(4));
    it('0.85 → 3', () => expect(velocityTrend(0.85)).toBe(3));
    it('0.70 → 2', () => expect(velocityTrend(0.7)).toBe(2));
    it('0.50 → 1', () => expect(velocityTrend(0.5)).toBe(1));
  });

  describe('costPerformanceIndex', () => {
    it('0.95 → 4', () => expect(costPerformanceIndex(0.95)).toBe(4));
    it('0.90 → 3', () => expect(costPerformanceIndex(0.9)).toBe(3));
    it('0.80 → 2', () => expect(costPerformanceIndex(0.8)).toBe(2));
    it('0.70 → 1', () => expect(costPerformanceIndex(0.7)).toBe(1));
  });

  describe('spendRate (delta from 1.0)', () => {
    it('exact 1.0 (delta 0) → 4', () => expect(spendRate(1.0)).toBe(4));
    it('delta 0.10 → 3', () => expect(spendRate(0.9)).toBe(3));
    it('delta 0.20 → 2', () => expect(spendRate(0.8)).toBe(2));
    it('delta 0.35 → 1', () => expect(spendRate(0.65)).toBe(1));
  });

  describe('forecastAccuracy (|EAC − BAC| / BAC)', () => {
    it('err 0.03 → 4', () => expect(forecastAccuracy(103, 100)).toBe(4));
    it('err 0.07 → 3', () => expect(forecastAccuracy(107, 100)).toBe(3));
    it('err 0.12 → 2', () => expect(forecastAccuracy(112, 100)).toBe(2));
    it('err 0.25 → 1', () => expect(forecastAccuracy(125, 100)).toBe(1));
  });

  describe('capexCompliance', () => {
    it('0.99 → 4', () => expect(capexCompliance(0.99)).toBe(4));
    it('0.95 → 3', () => expect(capexCompliance(0.95)).toBe(3));
    it('0.85 → 2', () => expect(capexCompliance(0.85)).toBe(2));
    it('0.70 → 1', () => expect(capexCompliance(0.7)).toBe(1));
  });

  describe('staffingFillRate', () => {
    it('0.98 → 4', () => expect(staffingFillRate(0.98)).toBe(4));
    it('0.90 → 3', () => expect(staffingFillRate(0.9)).toBe(3));
    it('0.75 → 2', () => expect(staffingFillRate(0.75)).toBe(2));
    it('0.50 → 1', () => expect(staffingFillRate(0.5)).toBe(1));
  });

  describe('teamMood (1..5 scale)', () => {
    it('4.0 → 4', () => expect(teamMood(4.0)).toBe(4));
    it('3.5 → 3', () => expect(teamMood(3.5)).toBe(3));
    it('3.0 → 2', () => expect(teamMood(3.0)).toBe(2));
    it('2.5 → 1', () => expect(teamMood(2.5)).toBe(1));
  });

  describe('overAllocationRate', () => {
    it('0.00 → 4', () => expect(overAllocationRate(0.0)).toBe(4));
    it('0.05 → 3', () => expect(overAllocationRate(0.05)).toBe(3));
    it('0.15 → 2', () => expect(overAllocationRate(0.15)).toBe(2));
    it('0.30 → 1', () => expect(overAllocationRate(0.3)).toBe(1));
  });

  describe('keyPersonRisk (% skills with ≥2 coverage)', () => {
    it('0.95 → 4', () => expect(keyPersonRisk(0.95)).toBe(4));
    it('0.80 → 3', () => expect(keyPersonRisk(0.8)).toBe(3));
    it('0.60 → 2', () => expect(keyPersonRisk(0.6)).toBe(2));
    it('0.40 → 1', () => expect(keyPersonRisk(0.4)).toBe(1));
  });

  describe('aggregation', () => {
    it('quadrantScore: [4,4,4,4] → 25', () => expect(quadrantScore([4, 4, 4, 4])).toBe(25));
    it('quadrantScore: [0,0,0,0] → 0', () => expect(quadrantScore([0, 0, 0, 0])).toBe(0));
    it('quadrantScore: [2,2,2,2] → round(12.5) = 13', () => expect(quadrantScore([2, 2, 2, 2])).toBe(13));
    it('quadrantScore: [null,null,null,null] → null', () => expect(quadrantScore([null, null, null, null])).toBeNull());
    it('quadrantScore: [4,4,null,null] → round(25) = 25', () => expect(quadrantScore([4, 4, null, null])).toBe(25));
    it('overallScore: [25,25,25,25] → 100', () => expect(overallScore([25, 25, 25, 25])).toBe(100));
    it('overallScore: [25,25,null,null] → 50', () => expect(overallScore([25, 25, null, null])).toBe(50));
  });

  describe('band mapping', () => {
    it('scoreToBand(4) = GREEN', () => expect(scoreToBand(4)).toBe('GREEN'));
    it('scoreToBand(3) = AMBER', () => expect(scoreToBand(3)).toBe('AMBER'));
    it('scoreToBand(2) = AMBER', () => expect(scoreToBand(2)).toBe('AMBER'));
    it('scoreToBand(1) = RED', () => expect(scoreToBand(1)).toBe('RED'));
    it('scoreToBand(0) = CRITICAL', () => expect(scoreToBand(0)).toBe('CRITICAL'));
    it('overallScoreToBand(100) = GREEN', () => expect(overallScoreToBand(100)).toBe('GREEN'));
    it('overallScoreToBand(76) = GREEN', () => expect(overallScoreToBand(76)).toBe('GREEN'));
    it('overallScoreToBand(75) = AMBER', () => expect(overallScoreToBand(75)).toBe('AMBER'));
    it('overallScoreToBand(51) = AMBER', () => expect(overallScoreToBand(51)).toBe('AMBER'));
    it('overallScoreToBand(50) = RED', () => expect(overallScoreToBand(50)).toBe('RED'));
    it('overallScoreToBand(26) = RED', () => expect(overallScoreToBand(26)).toBe('RED'));
    it('overallScoreToBand(25) = CRITICAL', () => expect(overallScoreToBand(25)).toBe('CRITICAL'));
    it('overallScoreToBand(0) = CRITICAL', () => expect(overallScoreToBand(0)).toBe('CRITICAL'));
  });
});
