// ============================================================
// ჩოთქი — Georgian Traditional Score Display System
//
// Traditional Georgian domino uses a tally system:
// Marks are drawn as lines/strokes on paper or chalk on wall.
// Every 5 points = one "კვერი" (cross-hatch mark)
// We represent this visually using SVG tally marks.
// ============================================================

export interface ChotqiDisplay {
  groups: number;    // full groups of 5
  remainder: number; // 0-4 extra marks
  total: number;
}

/** Convert a score to ჩოთქი display data */
export function scoreToChotqi(score: number): ChotqiDisplay {
  return {
    groups: Math.floor(score / 5),
    remainder: score % 5,
    total: score,
  };
}

/** Format score for Georgian display */
export function formatGeoScore(score: number): string {
  if (score === 0) return '—';
  return score.toString();
}

/** Score milestone labels in Georgian */
export function getScoreMilestone(score: number): string | null {
  if (score >= 355) return 'გამარჯვება! 🏆';
  if (score >= 300) return 'ახლოვდება...';
  if (score >= 200) return 'კარგი თამაში';
  if (score === 0) return 'ბოლო';
  return null;
}

/** Check if score qualifies as მშრალი (dry loss) */
export function isMshrali(loserScore: number): boolean {
  return loserScore < 200;
}

/** Georgian team names */
export const TEAM_NAMES = {
  0: 'პირველი წყვილი',
  1: 'მეორე წყვილი',
} as const;

/** Short team labels */
export const TEAM_SHORT = {
  0: 'ა',
  1: 'ბ',
} as const;

/** Seat position labels in Georgian */
export const SEAT_LABELS = {
  0: 'სამხრეთი',  // South
  1: 'დასავლეთი', // West
  2: 'ჩრდილოეთი', // North
  3: 'აღმოსავლეთი', // East
} as const;

export const REACTIONS = [
  { emoji: '👏', label: 'ბრავო' },
  { emoji: '😂', label: 'სიცილი' },
  { emoji: '🤔', label: 'ფიქრი' },
  { emoji: '😤', label: 'გაბრაზება' },
  { emoji: '🎉', label: 'ზეიმი' },
  { emoji: '🐟', label: 'თევზი' }, // fish = blocked
  { emoji: '☕', label: 'ყავა' },
  { emoji: '🤝', label: 'პატივისცემა' },
];
