// Storage is always available; outbound traffic additionally needs a rollout scope.
export function rolloutAllows(settings, accountId, number, now = Date.now()) {
  if (!settings?.enabled) return false;
  if (settings.rolloutMode === 'live') return !!settings.smokeVerifiedAt && !!settings.smokeEvidence;
  return settings.rolloutMode === 'smoke' && settings.smokeAccountId === accountId
    && settings.smokeRecipient === number && settings.smokeExpiresAt > now;
}
