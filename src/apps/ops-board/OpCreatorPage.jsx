import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ModuleOpCreator from '@/apps/ops-board/OpCreator';

export default function OpCreatorPage() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});

  return (
    <ModuleOpCreator
      rank={outletContext.rank}
      callsign={outletContext.callsign}
      discordId={outletContext.discordId}
    />
  );
}
