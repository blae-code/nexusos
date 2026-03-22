export function parseCookies(req) {
  const header = req.headers?.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('=') || '');
    return acc;
  }, {});
}

export function isSecureRequest(req) {
  const proto = req.headers?.['x-forwarded-proto'] || req.headers?.['X-Forwarded-Proto'];
  if (typeof proto === 'string') {
    return proto.includes('https');
  }

  const host = req.headers?.host || '';
  return !host.includes('localhost');
}

export function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  segments.push(`Path=${options.path || '/'}`);

  if (options.maxAge != null) {
    segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.httpOnly !== false) {
    segments.push('HttpOnly');
  }
  if (options.sameSite) {
    segments.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    segments.push('Secure');
  }

  return segments.join('; ');
}
