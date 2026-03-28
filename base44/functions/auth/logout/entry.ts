/**
 * POST /auth/logout — Clear session cookie.
 */
import { handleIssuedKeyLogout } from '../_shared/issuedKey/entry.ts';

Deno.serve(handleIssuedKeyLogout);
