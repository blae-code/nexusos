import { base44 } from '@/core/data/base44Client';

export async function sendNexusNotification(payload) {
  try {
    const result = await base44.functions.invoke('notifyUser', payload);
    return result?.data || result || null;
  } catch (error) {
    console.warn('[notifyUser] failed:', error?.message || error);
    return null;
  }
}
