// App identity comes from factory-app.json: the final app name has a single source of truth.
import meta from '../../factory-app.json';
import pkg from '../../package.json';

export const APP_NAME: string = meta.displayName;
export const APP_PACKAGE: string = meta.package;
export const APP_VERSION: string = pkg.version;
