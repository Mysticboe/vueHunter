// Clamp battle damage so even weak turns still move combat forward.
export function calcDamage(attack, defense, scale = 1) {
  return Math.max(4, Math.round(attack * scale - defense * 0.45));
}
