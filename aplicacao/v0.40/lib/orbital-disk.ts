const diskVariants = ['spiral', 'twin-arms', 'rings', 'crescent'] as const;
const storageKey = 'antropologo:orbital-disk';
let pageVariant: OrbitalDiskVariant | undefined;

export type OrbitalDiskVariant = typeof diskVariants[number];

export function pickOrbitalDisk(previous: string | null, random = Math.random): OrbitalDiskVariant {
  const options = diskVariants.filter(variant => variant !== previous);
  return options[Math.floor(random() * options.length)];
}

/** Keep the selection across Home remounts. Storage only avoids consecutive repeats on reload. */
export function pageOrbitalDisk(): OrbitalDiskVariant {
  if (pageVariant) return pageVariant;
  try {
    const storage = window.sessionStorage;
    pageVariant = pickOrbitalDisk(storage.getItem(storageKey));
    storage.setItem(storageKey, pageVariant);
  } catch {
    pageVariant ??= pickOrbitalDisk(null);
  }
  return pageVariant;
}
