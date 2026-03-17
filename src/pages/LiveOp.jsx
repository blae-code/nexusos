import React from 'react';
import { useOutletContext } from 'react-router-dom';
import LiveOpModule from '@/app/modules/OpBoard/LiveOp';

export default function LiveOpPage() {
  const ctx = /** @type {any} */ (useOutletContext() || {});
  return <LiveOpModule />;
}
