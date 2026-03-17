export const Wallet = {
  name: 'Wallet',
  fields: {
    member_id: {
      type: 'string',
      required: true,
      unique: true,
    },
    balance_aUEC: {
      type: 'number',
      default: 0,
    },
    last_updated: {
      type: 'datetime',
    },
  },
};

export default Wallet;
