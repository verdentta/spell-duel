import { Config } from './types.js';
import dotenv from 'dotenv';
dotenv.config();


export const config: Config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  logger: Boolean(Number(process.env.LOGGER) ?? 0),
  workers: Number(process.env.WORKERS ?? 1),
  png: {
    enabled: Boolean(Number(process.env.PNG ?? 1)),
    size: {
      min: Number(process.env.PNG_SIZE_MIN ?? 1),
      max: Number(process.env.PNG_SIZE_MAX ?? 256),
      default: Number(process.env.PNG_SIZE_DEFAULT ?? 128),
    },
    exif: Boolean(Number(process.env.PNG_EXIF ?? 1)),
  },
  jpeg: {
    enabled: Boolean(Number(process.env.JPEG ?? 1)),
    size: {
      min: Number(process.env.JPEG_SIZE_MIN ?? 1),
      max: Number(process.env.JPEG_SIZE_MAX ?? 256),
      default: Number(process.env.JPEG_SIZE_DEFAULT ?? 128),
    },
    exif: Boolean(Number(process.env.JPEG_EXIF ?? 1)),
  },
  webp: {
    enabled: Boolean(Number(process.env.WEBP ?? 1)),
    size: {
      min: Number(process.env.WEBP_SIZE_MIN ?? 1),
      max: Number(process.env.WEBP_SIZE_MAX ?? 256),
      default: Number(process.env.WEBP_SIZE_DEFAULT ?? 128),
    },
    exif: Boolean(Number(process.env.WEBP_EXIF ?? 1)),
  },
  avif: {
    enabled: Boolean(Number(process.env.AVIF ?? 1)),
    size: {
      min: Number(process.env.AVIF_SIZE_MIN ?? 1),
      max: Number(process.env.AVIF_SIZE_MAX ?? 256),
      default: Number(process.env.AVIF_SIZE_DEFAULT ?? 128),
    },
    exif: Boolean(Number(process.env.AVIF_EXIF ?? 1)),
  },
  json: {
    enabled: Boolean(Number(process.env.JSON ?? 1)),
  },
  versions: process.env.VERSIONS?.split(',').map(Number) ?? [5, 6, 7, 8, 9],
  cacheControl: {
    avatar: Number(process.env.CACHE_CONTROL_AVATARS ?? 60 * 60 * 24 * 365),
  },
};
