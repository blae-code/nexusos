export const CargoJob = {
  name: 'CargoJob',
  fields: {
    job_type: {
      type: 'string',
      enum: ['HAUL', 'COLLECT', 'DELIVER'],
    },
    status: {
      type: 'string',
      enum: ['OPEN', 'CLAIMED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED'],
    },
    risk_tier: {
      type: 'string',
      enum: ['GREEN', 'AMBER', 'RED'],
    },
    issuer_id: {
      type: 'string',
      required: true,
    },
    courier_id: {
      type: 'string',
    },
    cargo_manifest: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
    pickup_location: {
      type: 'string',
      required: true,
    },
    delivery_location: {
      type: 'string',
      required: true,
    },
    reward_aUEC: {
      type: 'number',
      required: true,
    },
    collateral_aUEC: {
      type: 'number',
      required: true,
    },
    claimed_at: {
      type: 'datetime',
    },
    delivered_at: {
      type: 'datetime',
    },
    confirmed_at: {
      type: 'datetime',
    },
    failed_at: {
      type: 'datetime',
    },
    notes: {
      type: 'string',
    },
  },
};

export default CargoJob;
