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

function createDeferred<T>() {
	type PromiseResolve = (value: T) => void;
	type PromiseReject = (reason: unknown) => void;
	const deferred = {} as {
		promise: Promise<T>;
		reject: PromiseReject;
		resolve: PromiseResolve;
	};
	deferred.promise = new Promise<T>((resolve, reject) => {
		deferred.resolve = resolve;
		deferred.reject = reject;
	});
	return deferred;
}

type Deferred<T> = ReturnType<typeof createDeferred<T>>;

function createSafeDeferred<T>() {
	const deferred = createDeferred();

	deferred.promise.catch(() => {
		// prevent unhandled promise rejection
	});
	return deferred as Deferred<T>;
}

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
		const deferreds = new Map<TsonAsyncIndex, Deferred<unknown>>();
		const instance = iterator[Symbol.asyncIterator]();

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

					deferreds.set(idx, createSafeDeferred());
					// console.log("creating deferred for", idx, "with value", walkedValue);

					return transformer.deserialize({
						// abortSignal
						onDone() {
							deferreds.delete(idx);
						},
						stream: {
							[Symbol.asyncIterator]: () => {
								// console.log("checking next", idx);
								return {
									next: async () => {
										const def = deferreds.get(idx);

										if (def) {
											// console.log("waiting for deferred", idx, def.promise);

											const value = await def.promise;

											deferreds.set(idx, createSafeDeferred());

											return {
												done: false,
												value,
											};
										}

										return {
											done: true,
											value: undefined,
										};
									},
								};
							},
						},
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

				// console.log("got something that looks like a value", str);

				const [index, result] = JSON.parse(str) as TsonAsyncValueTuple;

				const deferred = deferreds.get(index);
				// console.log("got deferred", index, deferred);
				// console.log("got value", index, status, result, deferred);
				const walkedResult = walk(result);

				assert(deferred, `No deferred found for index ${index}`);

				// resolving deferred
				deferred.resolve(walkedResult);

				deferreds.delete(index);
			}

			buffer.forEach(readLine);

			let nextValue = await instance.next();

			while (!nextValue.done) {
				// console.log("got next value", nextValue);
				nextValue.value.split("\n").forEach(readLine);

				nextValue = await instance.next();
			}

			assert(
				!deferreds.size,
				`Stream ended with ${deferreds.size} pending promises`,
			);
		}

		async function init() {
			const lines: string[] = [];

			// get the head of the JSON

			// console.log("getting head of JSON");
			let lastResult: IteratorResult<string>;
			do {
				lastResult = await instance.next();

				lines.push(...(lastResult.value as string).split("\n").filter(Boolean));

				// console.log("got line", lines);
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

					// cancel all pending promises
					for (const deferred of deferreds.values()) {
						deferred.reject(err);
					}

					deferreds.clear();

					opts.onStreamError?.(err);
				});
			}
		}

		const result = await init().catch((cause: unknown) => {
			throw new TsonError("Failed to initialize TSON stream", { cause });
		});
		return [result, deferreds] as const;
	};
}

export function createTsonParseAsync(opts: TsonAsyncOptions): TsonParseAsync {
	const instance = createTsonParseAsyncInner(opts);

	return (async (iterator) => {
		const [result] = await instance(iterator);

		return result;
	}) as TsonParseAsync;
}
