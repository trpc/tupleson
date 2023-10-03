import { CircularReferenceError, PromiseRejectionError } from "./errors.js";
import { getNonce } from "./internals/getNonce.js";
import { mapOrReturn } from "./internals/mapOrReturn.js";
import {
	TsonAllTypes,
	TsonAsyncIndex,
	TsonAsyncOptions,
	TsonNonce,
	TsonSerializedValue,
	TsonTuple,
	TsonTypeHandlerKey,
	TsonTypeTesterCustom,
	TsonTypeTesterPrimitive,
} from "./types.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

const PROMISE_RESOLVED = 0 as const;
const PROMISE_REJECTED = 1 as const;

type TsonAsyncValueTuple = [
	TsonAsyncIndex,
	typeof PROMISE_REJECTED | typeof PROMISE_RESOLVED,
	unknown,
];

function walkerFactory(opts: TsonAsyncOptions) {
	// instance variables
	let promiseIndex = 0 as TsonAsyncIndex;
	const promises = new Map<
		TsonAsyncIndex,
		[TsonAsyncIndex, Promise<TsonAsyncValueTuple>]
	>();
	const seen = new WeakSet();
	const cache = new WeakMap<object, unknown>();
	const nonce: TsonNonce = opts.nonce
		? (opts.nonce() as TsonNonce)
		: getNonce();

	// helper fns
	function registerPromise(promise: Promise<unknown>): TsonAsyncIndex {
		const index = promiseIndex++ as TsonAsyncIndex;
		promises.set(index, [
			index,
			promise
				.then((result) => {
					const tuple: TsonAsyncValueTuple = [index, PROMISE_RESOLVED, result];
					return tuple;
				})
				//        ^?
				.catch((err) => {
					const tuple: TsonAsyncValueTuple = [index, PROMISE_REJECTED, err];

					return tuple;
				}),
		]);

		return index;
	}

	const handlers = (() => {
		const types = opts.types.map((handler) => {
			type Serializer = (
				value: unknown,
				nonce: TsonNonce,
				walk: WalkFn,
			) => TsonSerializedValue;

			const $serialize: Serializer = handler.serialize
				? (value, nonce, walk): TsonTuple => [
						handler.key as TsonTypeHandlerKey,
						walk(handler.serialize(value, registerPromise)),
						nonce,
				  ]
				: (value, _nonce, walk) => walk(value);
			return {
				...handler,
				$serialize,
			};
		});
		type Handler = (typeof types)[number];

		const byPrimitive: Partial<
			Record<TsonAllTypes, Extract<Handler, TsonTypeTesterPrimitive>>
		> = {};
		const nonPrimitive: Extract<Handler, TsonTypeTesterCustom>[] = [];

		for (const handler of types) {
			if (handler.primitive) {
				if (byPrimitive[handler.primitive]) {
					throw new Error(
						`Multiple handlers for primitive ${handler.primitive} found`,
					);
				}

				byPrimitive[handler.primitive] = handler;
			} else {
				nonPrimitive.push(handler);
			}
		}

		return [nonPrimitive, byPrimitive] as const;
	})();

	const [nonPrimitive, byPrimitive] = handlers;

	const walk: WalkFn = (value) => {
		const type = typeof value;
		const isComplex = !!value && type === "object";

		if (isComplex) {
			if (seen.has(value)) {
				const cached = cache.get(value);
				if (!cached) {
					throw new CircularReferenceError(value);
				}

				return cached;
			}

			seen.add(value);
		}

		const cacheAndReturn = (result: unknown) => {
			if (isComplex) {
				cache.set(value, result);
			}

			return result;
		};

		const primitiveHandler = byPrimitive[type];
		if (
			primitiveHandler &&
			(!primitiveHandler.test || primitiveHandler.test(value))
		) {
			return cacheAndReturn(primitiveHandler.$serialize(value, nonce, walk));
		}

		for (const handler of nonPrimitive) {
			if (handler.test(value)) {
				return cacheAndReturn(handler.$serialize(value, nonce, walk));
			}
		}

		return cacheAndReturn(mapOrReturn(value, walk));
	};

	return walk;
}

export function createAsyncTsonSerializer(opts: TsonAsyncOptions) {}
