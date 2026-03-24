export class NexusNotificationError extends Error {
  status: number;
  code: string;

  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

const VALID_SEVERITIES = new Set(['INFO', 'WARN', 'CRITICAL']);

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown): string | null {
  const normalized = textValue(value);
  return normalized || null;
}

export function parseNotificationPayload(input: Record<string, unknown>) {
  const type = textValue(input.type).toUpperCase();
  const title = textValue(input.title);
  const body = textValue(input.body);
  const severity = textValue(input.severity).toUpperCase();

  if (!type) {
    throw new NexusNotificationError('type_required', 400);
  }
  if (!title) {
    throw new NexusNotificationError('title_required', 400);
  }
  if (!body) {
    throw new NexusNotificationError('body_required', 400);
  }
  if (!VALID_SEVERITIES.has(severity)) {
    throw new NexusNotificationError('invalid_severity', 400);
  }

  return {
    type,
    title,
    body,
    severity,
    target_user_id: nullableText(input.target_user_id),
    source_module: nullableText(input.source_module) || 'SYSTEM',
    source_id: nullableText(input.source_id),
    is_read: false,
    created_at: new Date().toISOString(),
  };
}

export async function createNotification(base44: any, input: Record<string, unknown>) {
  const payload = parseNotificationPayload(input);
  return await base44.asServiceRole.entities.NexusNotification.create(payload);
}
