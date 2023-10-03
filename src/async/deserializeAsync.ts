/* eslint-disable @typescript-eslint/no-explicit-any, eslint-comments/disable-enable-pair */
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
	string: TsonAsyncStringifierIterator<TValue>,
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

		async function getStreamedValues(walk: WalkFn) {
			let nextValue = await instance.next();

			while (!nextValue.done) {
				let str = nextValue.value;

				str = str.trimStart();
				if (str.startsWith(",")) {
					// ignore leading comma
					str = str.slice(1);
				}

				// console.log("got value", str);

				if (str.startsWith("[")) {
					// console.log("got something that looks like a value", str);
					const [index, status, result] = JSON.parse(
						str,
					) as TsonAsyncValueTuple;

					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const deferred = deferreds.get(index)!;
					status === PROMISE_RESOLVED
						? deferred.resolve(walk(result))
						: deferred.reject(walk(result));
				}

				nextValue = await instance.next();
			}
		}

		async function init() {
			// get first two lines of iterator

			// ignore first line as it's just a `[`
			const firstLine = await instance.next();
			if (firstLine.value !== "[") {
				throw new TsonError("Expected first line to be `[`");
			}

			// second line is the serialized payload
			const second = await instance.next();

			const secondValueParsed = JSON.parse(second.value) as TsonSerialized<any>;

			const walk = walker(secondValueParsed.nonce);

			const third = await instance.next();
			if ((third.value as string).trimStart() !== ",") {
				throw new TsonError("Expected third line to be `,`");
			}

			const fourth = await instance.next();
			if ((fourth.value as string).trimStart() !== "[") {
				throw new TsonError("Expected fourth line to be `[`");
			}

			void getStreamedValues(walk).catch((cause) => {
				throw new TsonError("Failed to parse TSON stream", { cause });
			});

			return walk(secondValueParsed.json);
		}

		const result = await init().catch((cause: unknown) => {
			throw new TsonError("Failed to parse TSON stream", { cause });
		});
		return result;
	}) as TsonParseAsync;
}
