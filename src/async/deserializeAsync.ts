/* eslint-disable @typescript-eslint/no-unused-vars */

import { TsonError } from "../errors.js";
import { assert } from "../internals/assert.js";
import { isTsonTuple } from "../internals/isTsonTuple.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonNonce,
	TsonSerialized,
	TsonTransformerSerializeDeserialize,
} from "../types.js";
import {
	TsonAsyncIndex,
	TsonAsyncOptions,
	TsonAsyncStringifierIterable,
	TsonAsyncType,
} from "./asyncTypes.js";
import { TsonAsyncValueTuple } from "./serializeAsync.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

type AnyTsonTransformerSerializeDeserialize =
	| TsonAsyncType<any, any>
	| TsonTransformerSerializeDeserialize<any, any>;

type TsonParseAsync = <TValue>(
	string: AsyncIterable<string> | TsonAsyncStringifierIterable<TValue>,
) => Promise<TValue>;

export function createTsonParseAsyncInner(opts: TsonAsyncOptions) {
	const typeByKey: Record<string, AnyTsonTransformerSerializeDeserialize> = {};

	for (const handler of opts.types) {
		if (handler.key) {
			if (typeByKey[handler.key]) {
				throw new Error(`Multiple handlers for key ${handler.key} found`);
			}

			typeByKey[handler.key] =
				handler as AnyTsonTransformerSerializeDeserialize;
		}
	}

	return async (iterable: AsyncIterable<string>) => {
		// this is an awful hack to get around making a some sort of pipeline
		const cache = new Map<
			TsonAsyncIndex,
			ReadableStreamDefaultController<unknown>
		>();
		const iterator = iterable[Symbol.asyncIterator]();

		const walker: WalkerFactory = (nonce) => {
			const walk: WalkFn = (value) => {
				if (isTsonTuple(value, nonce)) {
					const [type, serializedValue] = value;
					const transformer = typeByKey[type];

					assert(transformer, `No transformer found for type ${type}`);

					const walkedValue = walk(serializedValue);
					if (!transformer.async) {
						return transformer.deserialize(walk(walkedValue));
					}

					const idx = serializedValue as TsonAsyncIndex;

					const readable = new ReadableStream<unknown>({
						start(c) {
							cache.set(idx, c);
						},
					});

					return transformer.deserialize({
						// abortSignal
						get controller() {
							// the `start` method is called "immediately when the object is constructed"
							// [MDN](http://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream)
							// so we're guaranteed that the controller is set in the cache
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							return cache.get(idx)!;
						},
						reader: readable.getReader(),
					});
				}

				return mapOrReturn(value, walk);
			};

			return walk;
		};

		async function getStreamedValues(
			lines: string[],
			accumulator: string,
			walk: WalkFn,
		) {
			function readLine(str: string) {
				str = str.trimStart();

				if (str.startsWith(",")) {
					// ignore leading comma
					str = str.slice(1);
				}

				if (str.length < 2) {
					// minimum length is 2: '[]'
					return;
				}

				const [index, result] = JSON.parse(str) as TsonAsyncValueTuple;

				const controller = cache.get(index);

				const walkedResult = walk(result);

				assert(controller, `No stream found for index ${index}`);

				// resolving deferred
				controller.enqueue(walkedResult);
			}

			do {
				lines.forEach(readLine);
				lines.length = 0;
				const nextValue = await iterator.next();
				if (!nextValue.done) {
					accumulator += nextValue.value;
					const parts = accumulator.split("\n");
					accumulator = parts.pop() ?? "";
					lines.push(...parts);
				} else if (accumulator) {
					readLine(accumulator);
				}
			} while (lines.length);

			assert(!cache.size, `Stream ended with ${cache.size} pending promises`);
		}

		async function init() {
			let accumulator = "";

			// get the head of the JSON

			const lines: string[] = [];
			do {
				const nextValue = await iterator.next();
				if (nextValue.done) {
					throw new TsonError("Unexpected end of stream before head");
				}

				accumulator += nextValue.value;

				const parts = accumulator.split("\n");
				accumulator = parts.pop() ?? "";
				lines.push(...parts);
			} while (lines.length < 2);

			const [
				/**
				 * First line is just a `[`
				 */
				_firstLine,
				/**
				 * Second line is the shape of the JSON
				 */
				headLine,
				// .. third line is a `,`
				// .. fourth line is the start of the values array
				...buffer
			] = lines;

			assert(headLine, "No head line found");

			const head = JSON.parse(headLine) as TsonSerialized<any>;

			const walk = walker(head.nonce);

			try {
				return walk(head.json);
			} finally {
				getStreamedValues(buffer, accumulator, walk).catch((cause) => {
					// Something went wrong while getting the streamed values

					const err = new TsonError(
						`Stream interrupted: ${(cause as Error).message}`,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						{ cause },
					);

					// cancel all pending promises
					for (const controller of cache.values()) {
						controller.error(err);
					}

					cache.clear();

					opts.onStreamError?.(err);
				});
			}
		}

		const result = await init().catch((cause: unknown) => {
			throw new TsonError("Failed to initialize TSON stream", { cause });
		});
		return [result, cache] as const;
	};
}

export function createTsonParseAsync(opts: TsonAsyncOptions): TsonParseAsync {
	const instance = createTsonParseAsyncInner(opts);

	return (async (iterable) => {
		const [result] = await instance(iterable);

		return result;
	}) as TsonParseAsync;
}
