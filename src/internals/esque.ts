/**
 * @internal
 */
export interface TextDecoderEsque {
	decode(chunk: Uint8Array): string;
}

/**
 * A subset of the standard ReadableStream properties needed by tRPC internally.
 * @see ReadableStream from lib.dom.d.ts
 * @internal
 */
export interface WebReadableStreamEsque {
	getReader: () => ReadableStreamDefaultReader<Uint8Array>;
}

/**
 * @see NodeJS.ReadableStream from @types/node
 */
export interface NodeJSReadableStreamEsque {
	[Symbol.asyncIterator]: () => AsyncIterableIterator<Buffer | string>;
}
