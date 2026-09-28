import { expect, it } from 'vitest';
import { wreckCellFromLocal } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import { wreckCabinAt, wreckCabins } from './wreck-cabins.js';

it('locates C4-C7 in the expanded sea-margin grid rather than old local cells', () => {
  for (const [id, local] of Object.entries({ c4: [14, 4], c5: [14, 10], c6: [29, 4], c7: [29, 10] })) {
    expect(wreckCabinAt(wreckCellFromLocal(local[0]!, local[1]!), 'main')).toBe(id);
  }
  expect(wreckCabinAt({ col: 14, row: 4 }, 'main')).toBeNull();
  expect(wreckCabins.c4.minCol).toBe(wreckCellFromLocal(12, 3).col);
});
