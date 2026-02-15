/**
 * Split calculation pure logic
 *
 * Calculates how much each participant should pay based on their role/gender
 * ratios, with configurable rounding and remainder adjustment.
 */

export type Rounding = 'ceil_100' | 'ceil_500' | 'ceil_1000';

export interface ParticipantForSplit {
  id: string;
  role: string;
  gender: string | null;
}

export interface RatioEntry {
  role: string;
  gender: string | null;
  ratio: number;
}

export interface SplitResult {
  participantId: string;
  amount: number;
}

/**
 * Apply ceiling rounding to an amount based on the rounding rule.
 */
function applyRounding(amount: number, rounding: Rounding): number {
  switch (rounding) {
    case 'ceil_100':
      return Math.ceil(amount / 100) * 100;
    case 'ceil_500':
      return Math.ceil(amount / 500) * 500;
    case 'ceil_1000':
      return Math.ceil(amount / 1000) * 1000;
    default:
      return Math.ceil(amount / 100) * 100;
  }
}

/**
 * Find the matching ratio for a participant.
 * First tries to match by role + gender, then falls back to role-only.
 * "free" role always returns 0.
 */
function findRatio(participant: ParticipantForSplit, ratios: RatioEntry[]): number {
  // "free" role always gets 0
  if (participant.role === 'free') {
    return 0;
  }

  // Try exact match: role + gender
  if (participant.gender) {
    const exactMatch = ratios.find(
      (r) => r.role === participant.role && r.gender === participant.gender
    );
    if (exactMatch) {
      return exactMatch.ratio;
    }
  }

  // Fallback: role-only match (gender is null or not specified in ratios)
  const roleMatch = ratios.find(
    (r) => r.role === participant.role && (r.gender === null || r.gender === '' || r.gender === undefined)
  );
  if (roleMatch) {
    return roleMatch.ratio;
  }

  // If still no match, try any entry with the same role regardless of gender
  const anyRoleMatch = ratios.find((r) => r.role === participant.role);
  if (anyRoleMatch) {
    return anyRoleMatch.ratio;
  }

  // Default ratio of 1.0 if no matching rule found
  return 1.0;
}

/**
 * Calculate the split amounts for all participants.
 *
 * @param totalAmount - The total bill amount (integer, in yen)
 * @param participants - List of attending participants
 * @param ratios - Split ratio rules
 * @param rounding - Rounding method
 * @returns Array of { participantId, amount } for each participant
 */
export function calculateSplit(
  totalAmount: number,
  participants: ParticipantForSplit[],
  ratios: RatioEntry[],
  rounding: Rounding
): SplitResult[] {
  if (participants.length === 0) {
    return [];
  }

  // Assign ratios to each participant
  const participantRatios = participants.map((p) => ({
    participant: p,
    ratio: findRatio(p, ratios),
  }));

  // Calculate the sum of all ratios (excluding free / ratio=0)
  const totalRatio = participantRatios.reduce((sum, pr) => sum + pr.ratio, 0);

  // If totalRatio is 0 (everyone is free), return all zeros
  if (totalRatio === 0) {
    return participants.map((p) => ({
      participantId: p.id,
      amount: 0,
    }));
  }

  // Calculate each participant's share and apply rounding
  const results: SplitResult[] = participantRatios.map((pr) => {
    if (pr.ratio === 0) {
      return { participantId: pr.participant.id, amount: 0 };
    }

    const rawShare = (totalAmount * pr.ratio) / totalRatio;
    const roundedShare = applyRounding(rawShare, rounding);

    return {
      participantId: pr.participant.id,
      amount: roundedShare,
    };
  });

  // Calculate the difference between rounded total and actual total
  const roundedTotal = results.reduce((sum, r) => sum + r.amount, 0);
  const difference = roundedTotal - totalAmount;

  // Adjust the first non-free participant's amount to compensate for rounding
  if (difference !== 0) {
    const adjustableIndex = results.findIndex((r) => r.amount > 0);
    if (adjustableIndex !== -1) {
      results[adjustableIndex].amount -= difference;
      // Ensure the adjusted amount doesn't go negative
      if (results[adjustableIndex].amount < 0) {
        results[adjustableIndex].amount = 0;
      }
    }
  }

  return results;
}
