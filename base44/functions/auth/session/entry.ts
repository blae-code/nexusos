/**
 * GET /auth/session — Validate session cookie, return user data.
 */
import { handleIssuedKeySession } from '../_shared/issuedKey/entry.ts';

Deno.serve(handleIssuedKeySession);
