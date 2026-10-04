import { createBlueAuthHandler } from './_lib/blue-auth.js';

export default async function handler(req, res) {
  return createBlueAuthHandler()(req, res, 'session');
}
