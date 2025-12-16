/// <reference lib="webworker" />
import { expose, transfer } from 'comlink';
import { PakArchive } from 'quake2ts/engine';

export interface ParseResult {
  entries: Map<string, any>;
  buffer: ArrayBuffer;
  name: string;
}

const parsePak = (name: string, buffer: ArrayBuffer): ParseResult => {
  // Parse in the worker
  const archive = PakArchive.fromArrayBuffer(name, buffer);

  // Extract entries map.
  // @ts-ignore
  const entries = archive.entries;

  // We return the buffer back so the main thread can own it again.
  return transfer({
    entries: entries as Map<string, any>, // Cast to satisfy interface
    buffer,
    name
  }, [buffer]);
};

expose({
  parsePak
});
