import React from 'react';

/**
 * What a live Catalyst owner still has to add: services and prices, and a team contact.
 * Each line jumps to where it is filled in, and leaves once it is done.
 */
export function SetupReminder({ s, setup, onGo }) {
  if (!setup) return null;
  const left = [
    !setup.services && { id: 'services', label: s.t('setupServices'), go: () => onGo('settings', { view: 'brain', part: 'catalog' }) },
    !setup.teamContact && { id: 'contact', label: s.t('setupTeamContact'), go: () => onGo('settings', { view: 'brain', part: 'bzns' }) },
  ].filter(Boolean);
  if (!left.length) return null;
  return (
    <section className="ld-reminder" aria-labelledby="ld-reminder-title">
      <h2 id="ld-reminder-title">{s.t('setupReminderTitle')}</h2>
      <p>{s.t('setupReminderBody')}</p>
      <ul>{left.map(item => (
        <li key={item.id}><a href={`?tab=settings&view=brain&part=${item.id === 'services' ? 'catalog' : 'bzns'}`} onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); item.go(); }}>{item.label}</a></li>
      ))}</ul>
    </section>
  );
}
