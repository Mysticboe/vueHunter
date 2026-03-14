// 给伤害设置下限，保证弱势回合也能推动战斗继续前进。
export function calcDamage(attack, defense, scale = 1) {
  return Math.max(4, Math.round(attack * scale - defense * 0.45));
}
