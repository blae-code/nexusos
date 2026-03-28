/**
 * POST /auth/login — Issued username + auth key login.
 */
import { handleIssuedKeySignIn } from '../_shared/issuedKey/entry.ts';

Deno.serve(handleIssuedKeySignIn);
