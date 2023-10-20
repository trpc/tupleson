/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { TsonError } from "../errors.js";
import { assert } from "../internals/assert.js";
import { isTsonTuple } from "../internals/isTsonTuple.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonNonce,
	TsonSerialized,
	TsonTransformerSerializeDeserialize,
} from "../sync/syncTypes.js";
import { TsonAbortError, TsonStreamInterruptedError } from "./asyncErrors.js";
import {
	TsonAsyncIndex,
	TsonAsyncOptions,
	TsonAsyncStringifierIterable,
	TsonAsyncType,
} from "./asyncTypes.js";
import {
	createReadableStream,
	mapIterable,
	readableStreamToAsyncIterable,
} from "./iterableUtils.js";
import { TsonAsyncValueTuple } from "./serializeAsync.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

type AnyTsonTransformerSerializeDeserialize =
	| TsonAsyncType<any, any>
	| TsonTransformerSerializeDeserialize<any, any>;

export interface TsonParseAsyncOptions {
	/**
	 * On stream error
	 */
	onStreamError?: (err: TsonStreamInterruptedError) => void;
	/**
	 * Allow reconnecting to the stream if it's interrupted
	 * @default false
	 */
	reconnect?: boolean;
}

type TsonParseAsync = <TValue>(
	string: AsyncIterable<string> | TsonAsyncStringifierIterable<TValue>,
	opts?: TsonParseAsyncOptions,
) => Promise<TValue>;

type TsonDeserializeIterableValue = TsonAsyncValueTuple | TsonSerialized;
type TsonDeserializeIterable = AsyncIterable<TsonDeserializeIterableValue>;
function createTsonDeserializer(opts: TsonAsyncOptions) {
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

	return async (
		iterable: TsonDeserializeIterable,
		parseOptions: TsonParseAsyncOptions,
	) => {
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

					if (!transformer.async) {
						const walkedValue = walk(serializedValue);
						return transformer.deserialize(walkedValue);
					}

					const idx = serializedValue as TsonAsyncIndex;

					const [readable, controller] = createReadableStream();

					// the `start` method is called "immediately when the object is constructed"
					// [MDN](http://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream)
					// so we're guaranteed that the controller is set in the cache
					assert(controller, "Controller not set - this is a bug");

					cache.set(idx, controller);

					return transformer.deserialize({
						close() {
							controller.close();
							cache.delete(idx);
						},
						reader: readable.getReader(),
					});
				}

				return mapOrReturn(value, walk);
			};

			return walk;
		};

		async function getStreamedValues(walk: WalkFn) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			while (true) {
				const nextValue = await iterator.next();
				if (nextValue.done) {
					break;
				}

				const { value } = nextValue;

				if (!Array.isArray(value)) {
					// we got the beginning of a new stream - probably because a reconnect
					// we assume this new stream will have the same shape and restart the walker with the nonce
					if (!parseOptions.reconnect) {
						throw new TsonStreamInterruptedError(
							"Stream interrupted and reconnecting is not allowed",
						);
					}

					await getStreamedValues(walker(value.nonce));
					return;
				}

				const [index, result] = value as TsonAsyncValueTuple;

				const controller = cache.get(index);

				const walkedResult = walk(result);

				assert(controller, `No stream found for index ${index}`);

				// resolving deferred
				controller.enqueue(walkedResult);
			}
		}

		async function init() {
			// get the head of the JSON
			const nextValue = await iterator.next();
			if (nextValue.done) {
				throw new TsonError("Unexpected end of stream before head");
			}

			const head = nextValue.value as TsonSerialized<any>;

			const walk = walker(head.nonce);

			try {
				const walked = walk(head.json);

				return walked;
			} finally {
				getStreamedValues(walk).catch((cause) => {
					// Something went wrong while getting the streamed values

					const err = new TsonStreamInterruptedError(cause);

					// enqueue the error to all the streams
					for (const controller of cache.values()) {
						controller.enqueue(err);
					}

					parseOptions.onStreamError?.(err);
				});
			}
		}

		return await init().catch((cause: unknown) => {
			throw new TsonStreamInterruptedError(cause);
		});
	};
}

function lineAccumulator() {
	let accumulator = "";
	const lines: string[] = [];

	return {
		lines,
		push(chunk: string) {
			accumulator += chunk;

			const parts = accumulator.split("\n");
			accumulator = parts.pop() ?? "";
			lines.push(...parts);
		},
	};
}

async function* stringIterableToTsonIterable(
	iterable: AsyncIterable<string>,
): TsonDeserializeIterable {
	// get the head of the JSON
	const acc = lineAccumulator();

	// state of stream
	const AWAITING_HEAD = 0;
	const STREAMING_VALUES = 1;
	const ENDED = 2;

	let state: typeof AWAITING_HEAD | typeof ENDED | typeof STREAMING_VALUES =
		AWAITING_HEAD;

	// iterate values & yield them

	for await (const str of iterable) {
		acc.push(str);

		if (state === AWAITING_HEAD && acc.lines.length >= 2) {
			/**
			 * First line is just a `[`
			 */
			acc.lines.shift();

			// Second line is the head
			const headLine = acc.lines.shift();

			assert(headLine, "No head line found");

			const head = JSON.parse(headLine) as TsonSerialized<any>;

			yield head;

			state = STREAMING_VALUES;
		}

		if (state === STREAMING_VALUES) {
			while (acc.lines.length) {
				let str = acc.lines.shift()!;

				// console.log("got str", str);
				str = str.trimStart();

				if (str.startsWith(",")) {
					// ignore leading comma
					str = str.slice(1);
				}

				if (str === "" || str === "[" || str === ",") {
					// beginning of values array or empty string
					continue;
				}

				if (str === "]]") {
					// end of values and stream
					state = ENDED;
					continue;
				}

				yield JSON.parse(str) as TsonAsyncValueTuple;
			}
		}
	}

	assert(state === ENDED, `Stream ended unexpectedly (state ${state})`);
}

export function createTsonParseAsync(opts: TsonAsyncOptions): TsonParseAsync {
	const instance = createTsonDeserializer(opts);

	return (async (iterable, opts) => {
		const tsonIterable = stringIterableToTsonIterable(iterable);

		return await instance(tsonIterable, opts ?? {});
	}) as TsonParseAsync;
}

export function createTsonParseEventSource(opts: TsonAsyncOptions) {
	const instance = createTsonDeserializer(opts);

	return async <TValue = unknown>(
		url: string,
		parseOpts: TsonParseAsyncOptions & {
			signal?: AbortSignal;
		} = {},
	) => {
		const [stream, controller] =
			createReadableStream<TsonDeserializeIterableValue>();
		const eventSource = new EventSource(url);

		const { signal } = parseOpts;
		const onAbort = () => {
			assert(signal);
			eventSource.close();
			controller.error(new TsonAbortError("Stream aborted by user"));

			signal.removeEventListener("abort", onAbort);
		};

		signal?.addEventListener("abort", onAbort);

		eventSource.onmessage = (msg) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			controller.enqueue(JSON.parse(msg.data));
		};

		eventSource.addEventListener("close", () => {
			controller.close();
			eventSource.close();
		});

		const iterable = readableStreamToAsyncIterable(stream);
		return (await instance(iterable, parseOpts)) as TValue;
	};
}

export function createTsonParseJsonStreamResponse(opts: TsonAsyncOptions) {
	const instance = createTsonParseAsync(opts);

	return async <TValue = unknown>(response: Response) => {
		assert(response.body, "Response body is empty");

		const textDecoder = new TextDecoder();
		const stringIterator = mapIterable(
			readableStreamToAsyncIterable(response.body),
			(v) => textDecoder.decode(v),
		);

		const output = await instance<TValue>(stringIterator);

		return output;
	};
}
