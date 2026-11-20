export const GRADE_SCALE = [
  { min: 85, grade_letter: 'A', grade_point: 4.0 },
  { min: 80, grade_letter: 'AB', grade_point: 3.5 },
  { min: 70, grade_letter: 'B', grade_point: 3.0 },
  { min: 65, grade_letter: 'BC', grade_point: 2.5 },
  { min: 55, grade_letter: 'C', grade_point: 2.0 },
  { min: 40, grade_letter: 'D', grade_point: 1.0 },
  { min: 0, grade_letter: 'E', grade_point: 0.0 },
];

/**
 * Convert numeric score (0-100) to BR-13 grade letter and grade point.
 * Returns { grade_letter, grade_point } or null if empty/invalid.
 */
export function scoreToGrade(score) {
  if (score === null || score === undefined || score === '') {
    return null;
  }

  const numeric = typeof score === 'number' ? score : Number(String(score).trim());
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    return null;
  }

  for (const row of GRADE_SCALE) {
    if (numeric >= row.min) {
      return {
        grade_letter: row.grade_letter,
        grade_point: row.grade_point,
      };
    }
  }

  return null;
}
