import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Thin wrapper — invokes heraldBot with publishOp action.
 * Called from OpCreator frontend when an op is published.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { op_id } = await req.json();
    if (!op_id) return Response.json({ error: 'op_id required' }, { status: 400 });

    const result = await base44.asServiceRole.functions.invoke('heraldBot', {
      action: 'publishOp',
      payload: { op_id },
    });

    return Response.json(result?.data || { success: true });

  } catch (error) {
    console.error('publishOpToDiscord error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});