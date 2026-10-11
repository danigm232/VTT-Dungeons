import { expect, it } from 'vitest';
import { wreckCellFromLocal } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import { wreckCabinAt, wreckCabins } from './wreck-cabins.js';

it('locates C4-C7 in the expanded sea-margin grid rather than old local cells', () => {
  for (const [id, local] of Object.entries({ c4: [8, 4], c5: [8, 10], c6: [34, 4], c7: [34, 10] })) {
    expect(wreckCabinAt(wreckCellFromLocal(local[0]!, local[1]!), 'main')).toBe(id);
  }
  expect(wreckCabinAt(wreckCellFromLocal(14,4), 'main')).toBeNull();
  expect(wreckCabins.c4.minCol).toBe(wreckCellFromLocal(6, 3).col);
});
