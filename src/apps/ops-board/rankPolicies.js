export const OPS_PIONEER_RANKS = ['PIONEER', 'FOUNDER'];
export const OPS_LEADER_RANKS = ['SCOUT', 'VOYAGER', 'QUARTERMASTER', 'FOUNDER', 'PIONEER'];

export function isOpsPioneer(rank) {
  return OPS_PIONEER_RANKS.includes(rank);
}

export function isOpsLeader(rank) {
  return OPS_LEADER_RANKS.includes(rank);
}
