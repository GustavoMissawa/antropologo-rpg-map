import metadata from '../package.json' with {type:'json'};

declare const __ANTROPOLOGO_BUILD_COMMIT__: string | null;

// package.json is the only stored application version. The final .0 is package
// metadata; visitors see the development sequence 0.18, 0.19, …, 0.100.
export const SITE_VERSION=metadata.version.split('.').slice(0,2).join('.');

export const SITE_RELEASE = {
  version: SITE_VERSION,
  ...metadata.antropologoRelease,
  commit: typeof __ANTROPOLOGO_BUILD_COMMIT__ === 'string' ? __ANTROPOLOGO_BUILD_COMMIT__ : null,
};
