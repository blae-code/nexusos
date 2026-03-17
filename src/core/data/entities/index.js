export { default as Wallet } from './Wallet.js';
export { default as Transaction } from './Transaction.js';
export { default as Contract } from './Contract.js';
export { default as CargoJob } from './CargoJob.js';
export { default as Consignment } from './Consignment.js';

import Wallet from './Wallet.js';
import Transaction from './Transaction.js';
import Contract from './Contract.js';
import CargoJob from './CargoJob.js';
import Consignment from './Consignment.js';

export const entitySchemas = {
  Wallet,
  Transaction,
  Contract,
  CargoJob,
  Consignment,
};

export const ENTITY_NAMES = Object.freeze(
  Object.values(entitySchemas)
    .map((schema) => schema?.name)
    .filter(Boolean),
);

export default entitySchemas;
