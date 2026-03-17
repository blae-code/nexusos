export const Transaction = {
  name: 'Transaction',
  fields: {
    wallet_id: {
      type: 'string',
      required: true,
    },
    type: {
      type: 'string',
      enum: ['CREDIT', 'DEBIT', 'PENDING'],
    },
    amount_aUEC: {
      type: 'number',
      required: true,
    },
    description: {
      type: 'string',
    },
    reference_id: {
      type: 'string',
    },
    reference_type: {
      type: 'string',
    },
    created_at: {
      type: 'datetime',
    },
  },
};

export default Transaction;
