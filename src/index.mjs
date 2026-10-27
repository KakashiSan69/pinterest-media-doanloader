import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('./index.js');

export const search = pkg.search;
export const getPin = pkg.getPin;
export const download = pkg.download;
export default pkg;
