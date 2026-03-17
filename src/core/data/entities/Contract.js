export const Contract = {
  name: 'Contract',
  fields: {
    contract_type: {
      type: 'string',
      enum: ['EXCHANGE', 'COURIER', 'AUCTION'],
    },
    status: {
      type: 'string',
      enum: ['OPEN', 'ACTIVE', 'IN_TRANSIT', 'COMPLETE', 'FAILED', 'EXPIRED'],
    },
    issuer_id: {
      type: 'string',
      required: true,
    },
    assignee_id: {
      type: 'string',
    },
    title: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'string',
    },
    reward_aUEC: {
      type: 'number',
      default: 0,
    },
    collateral_aUEC: {
      type: 'number',
      default: 0,
    },
    cargo_manifest: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
    pickup_location: {
      type: 'string',
    },
    delivery_location: {
      type: 'string',
    },
    expires_at: {
      type: 'datetime',
    },
    created_at: {
      type: 'datetime',
    },
    accepted_at: {
      type: 'datetime',
    },
    completed_at: {
      type: 'datetime',
    },
  },
};

export default Contract;
