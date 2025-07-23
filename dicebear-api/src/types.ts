import { JSONSchema7 } from 'json-schema';

declare module 'fastify' {
  interface FastifyInstance {
    fonts: Font[];
  }
}

export type Core = {
  createAvatar: (
    style: any,
    options?: any
  ) => {
    toString: () => string;
    toJson: () => {
      svg: string;
      extra: Record<string, unknown>;
    };
  };
  schema: JSONSchema7;
};

export type Version = {
  core: Core;
  collection: Record<string, any>;
};

export type Config = {
  port: number;
  host: string;
  logger: boolean;
  workers: number;
  versions: number[];
  png: {
    enabled: boolean;
    size: {
      max: number;
      min: number;
      default: number;
    };
    exif: boolean;
  };
  jpeg: {
    enabled: boolean;
    size: {
      max: number;
      min: number;
      default: number;
    };
    exif: boolean;
  };
  webp: {
    enabled: boolean;
    size: {
      max: number;
      min: number;
      default: number;
    };
    exif: boolean;
  };
  avif: {
    enabled: boolean;
    size: {
      max: number;
      min: number;
      default: number;
    };
    exif: boolean;
  };
  json: {
    enabled: boolean;
  };
  cacheControl: {
    avatar: number;
  };
};

export type Font = {
  font: string;
  ranges: [number, number][];
};
