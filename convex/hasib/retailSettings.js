// The two store packs' follow-up rules (ascend/retail.md, ascend/retail-tech.md). Ahmed, 2026-10-12:
// as in Media, a message stating a recorded fact (ready for collection, back in stock, repair ready)
// sends by itself; a quote reminder waits as a draft; an exception is the team's task.
import { domainSettings, AUTO_RULE_MODES } from './workspace/settings.js';

const retail = domainSettings('retail',
  { readyUncollectedHours: 48 },
  { readyUncollectedHours: [1, 720] },
  { ready_for_collection: 30, back_in_stock: 5, order_unconfirmed: 120 },
  { ready_for_collection: { enabled: true, mode: 'auto' }, back_in_stock: { enabled: true, mode: 'auto' }, order_unconfirmed: { enabled: true, mode: 'task' } },
  AUTO_RULE_MODES);

const tech = domainSettings('retailTech',
  { readyUncollectedHours: 48 },
  { readyUncollectedHours: [1, 720] },
  { repair_ready: 30, back_in_stock: 5, repair_quote_reminder: 1440, overdue_repair: 60 },
  { repair_ready: { enabled: true, mode: 'auto' }, back_in_stock: { enabled: true, mode: 'auto' }, repair_quote_reminder: { enabled: true, mode: 'draft' }, overdue_repair: { enabled: true, mode: 'task' } },
  AUTO_RULE_MODES);

export const retailSettings = retail.read;
export const mergeRetailSettings = retail.merge;
export const retailTechSettings = tech.read;
export const mergeRetailTechSettings = tech.merge;
/** The pack's own settings reader. */
export const storeSettings = (packId, settings) => (packId === 'retail-tech' ? tech.read(settings) : retail.read(settings));
