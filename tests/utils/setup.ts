// Ensure globals like Request/Response/TextEncoder are available for JSDOM
import 'fast-text-encoding';
import { TextDecoder, TextEncoder } from 'util';
import 'whatwg-fetch'; // Polyfill fetch, Request, Response
import 'fake-indexeddb/auto'; // Polyfill IndexedDB
import { webcrypto } from 'crypto';

global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;

// Polyfill for Streams (Node 16+ has it but jsdom might hide it)
if (typeof global.TransformStream === 'undefined') {
    const { TransformStream, WritableStream, ReadableStream } = require('stream/web');
    global.TransformStream = TransformStream;
    global.WritableStream = WritableStream;
    global.ReadableStream = ReadableStream;
}

// Polyfill BroadcastChannel
if (typeof global.BroadcastChannel === 'undefined') {
    const { BroadcastChannel } = require('worker_threads');
    // @ts-ignore
    global.BroadcastChannel = BroadcastChannel;
}

import { Blob } from 'buffer';
// @ts-ignore
global.Blob = Blob;

if (typeof global.Response === 'undefined') {
    // Attempt to use native fetch from Node if available (Node 20+)
    if (typeof fetch !== 'undefined') {
        // @ts-ignore
        global.Response = Response;
        // @ts-ignore
        global.Request = Request;
        // @ts-ignore
        global.Headers = Headers;
    }
}

// Polyfill crypto
if (typeof global.crypto === 'undefined') {
    // @ts-ignore
    global.crypto = webcrypto;
} else {
    // Ensure subtle is available
    if (typeof global.crypto.subtle === 'undefined') {
        // @ts-ignore
        global.crypto.subtle = webcrypto.subtle;
    }

    // Polyfill randomUUID if missing
    if (typeof global.crypto.randomUUID === 'undefined') {
         // @ts-ignore
         global.crypto.randomUUID = () => {
             return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
                 (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
             );
         };
    }
}

// Final fallback for randomUUID if webcrypto assignment didn't bring it in (Node < 19?)
if (!global.crypto.randomUUID) {
    try {
        global.crypto.randomUUID = require('crypto').randomUUID;
    } catch (e) {
        // ignore
    }
}
