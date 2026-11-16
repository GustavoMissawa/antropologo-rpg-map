import metadata from '../package.json' with {type:'json'};

// package.json is the only stored application version. The final .0 is package
// metadata; visitors see the development sequence 0.18, 0.19, …, 0.100.
export const SITE_VERSION=metadata.version.split('.').slice(0,2).join('.');
