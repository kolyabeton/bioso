// Hero health uses whole points. One former health segment is 25 points.
export const HERO_HP_PER_SEGMENT=25;
export const heroHealthPoints=segments=>Math.max(0,Math.round(segments*HERO_HP_PER_SEGMENT));
