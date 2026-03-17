export const Consignment = {
  name: 'Consignment',
  fields: {
    consignor_id: {
      type: 'string',
      required: true,
    },
    goods: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
    asking_price_aUEC: {
      type: 'number',
      required: true,
    },
    commission_rate: {
      type: 'number',
      default: 5,
    },
    status: {
      type: 'string',
      enum: ['PENDING', 'LISTED', 'SOLD', 'RETURNED'],
    },
    proceeds_aUEC: {
      type: 'number',
    },
    settled_at: {
      type: 'datetime',
    },
    created_at: {
      type: 'datetime',
    },
  },
};

export default Consignment;
