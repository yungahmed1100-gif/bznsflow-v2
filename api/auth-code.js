import { createBlueAuthHandler } from './_lib/blue-auth.js';

export const RATE_IP_PER_MIN = 5;
export const RATE_GLOBAL_PER_DAY = 300;

export default async function handler(req, res) {
  return createBlueAuthHandler()(req, res, 'code');
}
