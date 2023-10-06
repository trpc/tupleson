/* eslint-disable @typescript-eslint/no-unused-vars */

import { TsonError } from "../errors.js";
import { assert } from "../internals/assert.js";
import { isTsonTuple } from "../internals/isTsonTuple.js";
import { readableStreamToAsyncIterable } from "../internals/iterableUtils.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonNonce,
	TsonSerialized,
	TsonTransformerSerializeDeserialize,
} from "../types.js";
import {
	TsonAsyncIndex,
	TsonAsyncOptions,
	TsonAsyncStringifierIterator,
	TsonAsyncType,
} from "./asyncTypes.js";
import { TsonAsyncValueTuple } from "./serializeAsync.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

type AnyTsonTransformerSerializeDeserialize =
	| TsonAsyncType<any, any>
	| TsonTransformerSerializeDeserialize<any, any>;

type TsonParseAsync = <TValue>(
	string: AsyncIterable<string> | TsonAsyncStringifierIterator<TValue>,
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

	return async (iterator: AsyncIterable<string>) => {
		// this is an awful hack to get around making a some sort of pipeline
		const instance = iterator[Symbol.asyncIterator]();

		const streamByIndex = new Map<
			TsonAsyncIndex,
			{
				controller: ReadableStreamController<unknown>;
				stream: ReadableStream<unknown>;
			}
		>();

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

					// create a new stream for this index if one doesn't exist
					assert(
						!streamByIndex.has(idx),
						`Stream already exists for index ${idx}`,
					);
					let controller: ReadableStreamDefaultController<unknown> =
						null as unknown as ReadableStreamDefaultController<unknown>;
					const stream = new ReadableStream({
						start(c) {
							controller = c;
						},
					});
					assert(controller, "Controller not set");
					streamByIndex.set(idx, {
						controller,
						stream,
					});

					assert(controller as any, "No controller found");

					return transformer.deserialize({
						// abortSignal
						onDone() {
							try {
								controller.close();
								streamByIndex.delete(idx);
							} catch {
								// ignore
							}
						},
						stream: readableStreamToAsyncIterable(stream),
					});
				}

				return mapOrReturn(value, walk);
			};

			return walk;
		};

		async function getStreamedValues(
			buffer: string[],

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

				const item = streamByIndex.get(index);

				const walkedResult = walk(result);

				assert(item, `No stream found for index ${index}`);

				// FIXME: I don't know why this requires array buffer
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				item.controller.enqueue(walkedResult as any);
			}

			buffer.forEach(readLine);

			let nextValue = await instance.next();

			while (!nextValue.done) {
				nextValue.value.split("\n").forEach(readLine);

				nextValue = await instance.next();
			}

			for (const item of streamByIndex.values()) {
				item.controller.close();
			}

			assert(streamByIndex.size === 0, "Not all streams were closed");
		}

		async function init() {
			const lines: string[] = [];

			// get the head of the JSON

			let lastResult: IteratorResult<string>;
			do {
				lastResult = await instance.next();

				lines.push(...(lastResult.value as string).split("\n").filter(Boolean));
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
				getStreamedValues(buffer, walk).catch((cause) => {
					// Something went wrong while getting the streamed values

					const err = new TsonError(
						`Stream interrupted: ${(cause as Error).message}`,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						{ cause },
					);

					// cancel all pending streams
					for (const { controller } of streamByIndex.values()) {
						controller.error(err);
					}

					opts.onStreamError?.(err);
				});
			}
		}

		const result = await init().catch((cause: unknown) => {
			throw new TsonError("Failed to initialize TSON stream", { cause });
		});
		return [result, streamByIndex] as const;
	};
}

export function createTsonParseAsync(opts: TsonAsyncOptions): TsonParseAsync {
	const instance = createTsonParseAsyncInner(opts);

	return (async (iterator) => {
		const [result] = await instance(iterator);

		return result;
	}) as TsonParseAsync;
}
