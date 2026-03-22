export function formatFormScore(score: number): string {
  if (score > 0.5) return "Strong recent form — on a winning run";
  if (score >= 0.2) return "Decent form — more wins than losses lately";
  if (score >= -0.2) return "Mixed form — both teams performing similarly";
  if (score >= -0.5) return "Struggling recently — inconsistent results";
  return "Poor form — on a losing run";
}

export function formatH2HScore(score: number): string {
  if (score > 0.5) return "Historically dominates this opponent";
  if (score > 0) return "Slight historical edge in this fixture";
  if (score === 0) return "Evenly matched historically";
  return "Opponent has won more of these meetings";
}

export function formatTablePositionScore(score: number): string {
  if (score > 0.5) return "Much higher in the league table";
  if (score >= 0) return "Slightly better league position";
  return "Up against a significantly higher-ranked team";
}

export function formatInjuryImpact(score: number): string {
  if (score > 0.1) return "Opponent dealing with injury concerns";
  if (score >= -0.1) return "Both squads relatively healthy";
  return "Some injury concerns in this squad";
}

export function formatRestDaysScore(score: number): string {
  if (score > 0.2) return "Better rested than the opponent";
  if (score < -0.2) return "Less rest than the opponent — possible fatigue";
  return "Both teams similarly rested";
}

export function getFactorText(name: string, score: number): string {
  switch (name) {
    case 'Form Score':
      return formatFormScore(score);
    case 'Injury Impact':
      return formatInjuryImpact(score);
    case 'H2H Score':
      return formatH2HScore(score);
    case 'Table Position':
      return formatTablePositionScore(score);
    case 'Rest Days':
      return formatRestDaysScore(score);
    default:
      return `${name}: ${score > 0 ? 'Favorable' : 'Unfavorable'}`;
  }
}
