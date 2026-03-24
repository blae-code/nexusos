export function qualityScoreFromPercent(percent) {
  const numeric = Number(percent);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1000, Math.round(numeric * 10)));
}

export function qualityPercentFromRecord(record) {
  const score = Number(record?.quality_score);
  if (Number.isFinite(score) && score > 0) {
    return Math.max(0, Math.min(100, score / 10));
  }

  const percent = Number(record?.quality_pct);
  if (Number.isFinite(percent)) {
    return Math.max(0, Math.min(100, percent));
  }

  return 0;
}

export function isT2Eligible(record) {
  const score = Number(record?.quality_score);
  if (Number.isFinite(score) && score > 0) {
    return score >= 800;
  }

  return qualityPercentFromRecord(record) >= 80;
}
