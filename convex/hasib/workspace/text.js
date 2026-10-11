// The words every sector's drafts open and date with, in the business's timezone.
import { formatLocal } from '../../../src/lib/timezone.js';

export const greeting = (name, arabic) => arabic ? `مرحباً${name ? ` ${name}` : ''}،` : `Hello${name ? ` ${name}` : ''},`;
export const localWhen = (ms, tz) => formatLocal(ms, tz).replace('T', ' ');
export const localDay = (ms, tz) => formatLocal(ms, tz).slice(0, 10);
