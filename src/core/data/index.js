import { base44, getBase44Client } from './base44Client';
import entitySchemas, { ENTITY_NAMES } from './entities';

function createEntityExports() {
  return ENTITY_NAMES.reduce((accumulator, entityName) => {
    Object.defineProperty(accumulator, entityName, {
      enumerable: true,
      get() {
        return base44.entities[entityName];
      },
    });
    return accumulator;
  }, {});
}

export const entities = createEntityExports();
export { base44, getBase44Client, entitySchemas, ENTITY_NAMES };
export * from './entities';

export default {
  base44,
  entities,
  entitySchemas,
};
