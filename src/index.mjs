import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('./index.js');

export const search = pkg.search;
export const getPin = pkg.getPin;
export const download = pkg.download;
export const isPinterestUrl = pkg.isPinterestUrl;
export const isShortUrl = pkg.isShortUrl;
export const extractPinId = pkg.extractPinId;
export const resolveShortUrl = pkg.resolveShortUrl;
export const normalizeUrl = pkg.normalizeUrl;

export default pkg;
