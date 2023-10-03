/* eslint-disable @typescript-eslint/no-explicit-any, eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { TsonError } from "../errors.js";
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
import { PROMISE_RESOLVED, TsonAsyncValueTuple } from "./serializeAsync.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

type AnyTsonTransformerSerializeDeserialize =
	| TsonAsyncType<any>
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

export function createTsonParseAsync(opts: TsonAsyncOptions): TsonParseAsync {
	const typeByKey: Record<string, AnyTsonTransformerSerializeDeserialize> = {};

	const deferreds = new Map<TsonAsyncIndex, Deferred<unknown>>();
	for (const handler of opts.types) {
		if (handler.key) {
			if (typeByKey[handler.key]) {
				throw new Error(`Multiple handlers for key ${handler.key} found`);
			}

			typeByKey[handler.key] =
				handler as AnyTsonTransformerSerializeDeserialize;
		}
	}

	return (async (iterator) => {
		const instance = iterator[Symbol.asyncIterator]();

		const walker: WalkerFactory = (nonce) => {
			const walk: WalkFn = (value) => {
				if (isTsonTuple(value, nonce)) {
					const [type, serializedValue] = value;
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const transformer = typeByKey[type]!;
					return transformer.deserialize(
						walk(serializedValue) as any,
						(idx) => {
							const deferred = createDeferred<unknown>();

							deferreds.set(idx, deferred);

							return deferred.promise;
						},
					);
				}

				return mapOrReturn(value, walk);
			};

			return walk;
		};

		async function getStreamedValues(
			buffer: string[],
			done: boolean,
			walk: WalkFn,
		) {
			function readLine(str: string) {
				str = str.trimStart();
				if (!str) {
					return;
				}

				if (str.startsWith(",")) {
					// ignore leading comma
					str = str.slice(1);
				}

				if (!str.startsWith("[")) {
					return;
				}

				// console.log("got something that looks like a value", str);

				const [index, status, result] = JSON.parse(str) as TsonAsyncValueTuple;

				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const deferred = deferreds.get(index)!;

				const walkedResult = walk(result);
				status === PROMISE_RESOLVED
					? deferred.resolve(walkedResult)
					: deferred.reject(
							walkedResult instanceof Error
								? walkedResult
								: new TsonError("Promise rejected on server", {
										cause: walkedResult,
								  }),
					  );
			}

			buffer.forEach(readLine);

			if (done) {
				return;
			}

			let nextValue = await instance.next();

			while (!nextValue.done) {
				nextValue.value.split("\n").forEach(readLine);

				nextValue = await instance.next();
			}
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
			} while (lines.length < 4);

			const [
				/**
				 * First line is just a `[`
				 */
				_firstLine,
				/**
				 * Second line is the shape of the JSON
				 */
				secondLine,
				/**
				 * Third line is a `,`
				 */
				_thirdLine,
				/**
				 * Fourth line is the start of the values array
				 */
				_fourthLine,
				/**
				 * Buffer is the rest of the iterator that came in the chunks while we were waiting for the first 4 lines
				 */
				...buffer
			] = lines;

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const secondValueParsed = JSON.parse(secondLine!) as TsonSerialized<any>;

			const walk = walker(secondValueParsed.nonce);

			void getStreamedValues(buffer, !!lastResult.done, walk).catch((cause) => {
				// Something went wrong while getting the streamed values

				const err = new TsonError(
					"Stream interrupted: failed to get streamed values",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					{ cause },
				);

				// cancel all pending promises
				for (const deferred of deferreds.values()) {
					deferred.reject(err);
				}
			});

			return walk(secondValueParsed.json);
		}

		const result = await init().catch((cause: unknown) => {
			throw new TsonError("Failed to initialize TSON stream", { cause });
		});
		return result;
	}) as TsonParseAsync;
}
