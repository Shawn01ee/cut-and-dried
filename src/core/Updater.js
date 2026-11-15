/* global fetch, sessionStorage */
import { BUILD } from '../version.js';

/**
 * Keeps players on the newest deploy. GitHub Pages lets browsers cache files for ten minutes, so a player can keep
 * running old code after an update. This compares the running build with version.json (never cached); when they
 * differ it refetches every file the page loaded, bypassing the cache, and reloads.
 */
const TRIED_KEY = 'cd.updatedTo';

/** The newest deployed build id, or null if it cannot be read. */
async function latest() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    return r.ok ? (await r.json()).build || null : null;
  } catch { return null; }
}

/** Refreshes the cached copies of this page and the scripts and styles it loaded, then reloads. */
export async function refreshToLatest(build) {
  try { sessionStorage.setItem(TRIED_KEY, build || ''); } catch { /* the loop guard just isn't kept */ }
  const own = performance.getEntriesByType('resource').map(e => e.name).filter(u => u.startsWith(location.origin) && /\.(js|css|json)(\?|$)/.test(u));
  await Promise.all([location.href.split('#')[0], ...new Set(own)].map(u => fetch(u, { cache: 'reload' }).catch(() => null)));
  location.reload();
}

/**
 * Checks for a newer deploy. At start-up it updates straight away (once per build, so it can never loop);
 * later it only reports, so a running day is not cut short. Returns the newer build id, or null.
 */
export async function checkForUpdate({ atStart = false } = {}) {
  const build = await latest();
  if (!build || build === BUILD) return null;
  if (atStart) {
    let tried = null;
    try { tried = sessionStorage.getItem(TRIED_KEY); } catch { /* treat as not tried */ }
    if (tried !== build) { await refreshToLatest(build); return build; }
  }
  return build;
}
