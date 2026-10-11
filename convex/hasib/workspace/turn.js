// The gate every sector's Layla intake passes first: Hasib on, an Ascend plan, and the account on
// this sector's pack, which must be live (or the local preview harness).
import { isLivePack } from '../../../config/hasib-packs.js';
import { hasibEnabled } from '../gate.js';
import { HASIB_PLANS, planFor } from '../plans.js';
import { packFor } from '../shared.js';

/** The account's pack when the intake may run, else null. */
export async function sectorTurnPack(ctx, { row, secret, packId }) {
  if (!(await hasibEnabled(ctx)) || !HASIB_PLANS.includes(await planFor(ctx, row.accountId))) return null;
  const pack = await packFor(ctx, { accountId: row.accountId, row, secret });
  return pack.id === packId && (isLivePack(pack.id) || ctx.hasibPreview === true) ? pack : null;
}
