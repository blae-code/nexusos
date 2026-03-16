import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ModuleOpCreator from '@/app/modules/OpBoard/OpCreator';

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
