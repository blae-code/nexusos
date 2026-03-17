const LIVE_GREEN = 0x2EDB7A;
const WARN_AMBER = 0xF0AA24;

function toUtcString(value) {
  if (!value) return 'TBD';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'TBD';
  }

  return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

function normalizeRoleSlots(roleSlots = []) {
  if (!roleSlots) return [];

  if (Array.isArray(roleSlots)) {
    return roleSlots
      .map((slot) => {
        if (!slot) return null;
        if (typeof slot === 'string') {
          return { name: slot, capacity: 1 };
        }
        return {
          name: slot.name || slot.role || 'Unspecified',
          capacity: Number(slot.capacity || slot.count || 1),
        };
      })
      .filter(Boolean);
  }

  return Object.entries(roleSlots).map(([name, value]) => ({
    name,
    capacity: Number(
      typeof value === 'number'
        ? value
        : value?.capacity || value?.count || 1,
    ),
  }));
}

function formatRoleSlots(roleSlots) {
  const normalized = normalizeRoleSlots(roleSlots);
  if (normalized.length === 0) {
    return 'No role slots defined';
  }

  return normalized
    .map((slot) => `${slot.name} (${slot.capacity})`)
    .join('\n');
}

function formatSplitLines(splits = []) {
  return splits
    .map((split) => {
      const callsign = split.callsign || split.member_callsign || split.member || split.name || 'UNKNOWN';
      const amount = Number(split.amount_aUEC || split.amount || 0);
      return `• ${callsign}: ${amount.toLocaleString()} aUEC`;
    })
    .join('\n');
}

function totalSplitAmount(splits = []) {
  return splits.reduce(
    (sum, split) => sum + Number(split.amount_aUEC || split.amount || 0),
    0,
  );
}

export function opPublished(op = {}) {
  return {
    content: '',
    embeds: [
      {
        title: op.name || 'Operation Published',
        color: LIVE_GREEN,
        fields: [
          { name: 'Type', value: op.type || 'UNSPECIFIED', inline: true },
          { name: 'System', value: op.system_name || op.system || 'TBD', inline: true },
          { name: 'Location', value: op.location || 'TBD', inline: true },
          { name: 'Scheduled (UTC)', value: toUtcString(op.scheduled_at || op.scheduledAt), inline: false },
          { name: 'Role Slots', value: formatRoleSlots(op.role_slots || op.roleSlots), inline: false },
          { name: 'Access Type', value: op.access_type || op.accessType || 'OPEN', inline: true },
        ],
        footer: {
          text: `RSVP in NexusOS — ${op.link || op.url || ''}`.trim(),
        },
      },
    ],
  };
}

export function rsvpConfirmed(member = {}, op = {}, role = 'Unassigned') {
  return {
    content: `RSVP confirmed — ${op.name || 'operation'} as ${role}. Scheduled: ${toUtcString(op.scheduled_at || op.scheduledAt)}. Good luck out there.`,
  };
}

export function refineryReady(order = {}, member = {}) {
  return {
    content: `Your ${order.material || 'material'} refinery order is ready for collection at ${order.station || order.location || 'the refinery station'}.`,
  };
}

export function splitLogged(op = {}, splits = []) {
  return {
    content: '',
    embeds: [
      {
        title: `${op.name || 'Operation'} Split Logged`,
        color: LIVE_GREEN,
        description: formatSplitLines(splits) || 'No split records provided.',
        fields: [
          {
            name: 'Total',
            value: `${totalSplitAmount(splits).toLocaleString()} aUEC`,
            inline: false,
          },
        ],
      },
    ],
  };
}

export function memberVerified(member = {}) {
  const callsign = member.callsign || member.name || member.discord_id || member.id || 'UNKNOWN';
  console.log(`[Herald Bot] Member verified: ${callsign}`);
  return null;
}

export function opLive(op = {}) {
  return {
    content: `@here — ${op.name || 'Operation'} is now LIVE. Report to your stations.`,
    embeds: [
      {
        color: WARN_AMBER,
      },
    ],
  };
}

export default {
  opPublished,
  rsvpConfirmed,
  refineryReady,
  splitLogged,
  memberVerified,
  opLive,
};
