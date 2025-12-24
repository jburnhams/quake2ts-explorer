// Ensure globals like Request/Response/TextEncoder are available for JSDOM
import 'fast-text-encoding';
import { TextDecoder, TextEncoder } from 'util';
import 'whatwg-fetch'; // Polyfill fetch, Request, Response
import 'fake-indexeddb/auto'; // Polyfill IndexedDB

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

// Crypto is now natively supported in JSDOM > 20 (Node 19+ for global.crypto)
// We remove the manual polyfill.
