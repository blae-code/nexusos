import { base44 } from '@/core/data/base44Client';

/**
 * Read a sanitized member roster from the server so the browser never
 * receives raw NexusUser auth/session fields.
 */
export async function listMemberDirectory({ sort = '-joined_at', limit = 200 } = {}) {
  const response = await base44.functions.invoke('memberDirectory', { sort, limit });
  const data = response?.data || response || {};
  return Array.isArray(data.members) ? data.members : [];
}
