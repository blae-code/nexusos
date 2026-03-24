import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Fetch all armory items
    const items = await base44.entities.ArmoryItem.list('-quantity', 200);

    if (!items || items.length === 0) {
      return Response.json({ message: 'No items to check' });
    }

    // Find items below threshold
    const lowStockItems = items.filter(item => item.quantity <= item.min_threshold);

    if (lowStockItems.length === 0) {
      return Response.json({ message: 'All items in stock' });
    }

    // Generate alert summary
    const alertText = lowStockItems
      .map(item => `**${item.item_name}** (${item.category}): ${item.quantity}/${item.min_threshold} [RESTOCK NEEDED]`)
      .join('\n');

    return Response.json({
      success: true,
      low_stock_items: lowStockItems.length,
      alert_text: alertText,
      items: lowStockItems.map(i => ({
        name: i.item_name,
        current: i.quantity,
        threshold: i.min_threshold,
      })),
    });
  } catch (error) {
    console.error('Armory stock alert error:', error);
    return Response.json({ error: error.message || 'Alert check failed' }, { status: 500 });
  }
});
