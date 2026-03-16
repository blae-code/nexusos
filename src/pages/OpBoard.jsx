import React from 'react';
import { useOutletContext } from 'react-router-dom';
import OpBoardModule from '@/components/ops/OpBoardModule';

export default function OpBoardPage() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const rank = outletContext.rank;
  const callsign = outletContext.callsign;
  const discordId = outletContext.discordId;

  return <OpBoardModule rank={rank} callsign={callsign} discordId={discordId} />;
}