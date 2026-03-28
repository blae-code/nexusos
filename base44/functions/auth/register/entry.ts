/**
 * POST /auth/register — Legacy alias for first-use issued-key login.
 */
import { handleIssuedKeySignIn } from '../_shared/issuedKey/entry.ts';

Deno.serve(handleIssuedKeySignIn);
