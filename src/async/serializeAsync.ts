import {
	TsonCircularReferenceError,
	TsonPromiseRejectionError,
} from "../errors.js";
import { getNonce } from "../internals/getNonce.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonAllTypes,
	TsonNonce,
	TsonSerialized,
	TsonSerializedValue,
	TsonTuple,
	TsonTypeHandlerKey,
	TsonTypeTesterCustom,
	TsonTypeTesterPrimitive,
} from "../types.js";
import { TsonAsyncOptions } from "./asyncTypes.js";
import { TsonAsyncIndex } from "./asyncTypes.js";
import { TsonAsyncStringifier } from "./asyncTypes.js";

type WalkFn = (value: unknown) => unknown;

const PROMISE_RESOLVED = 0 as const;
const PROMISE_REJECTED = 1 as const;

export type TsonAsyncValueTuple = [
	TsonAsyncIndex,
	typeof PROMISE_REJECTED | typeof PROMISE_RESOLVED,
	unknown,
];

function walkerFactory(nonce: TsonNonce, types: TsonAsyncOptions["types"]) {
	// instance variables
	let promiseIndex = 0 as TsonAsyncIndex;
	const promises = new Map<TsonAsyncIndex, Promise<TsonAsyncValueTuple>>();
	const seen = new WeakSet();
	const cache = new WeakMap<object, unknown>();

	const iterator = {
		async *[Symbol.asyncIterator]() {
			while (promises.size > 0) {
				const tuple = await Promise.race(promises.values());

				promises.delete(tuple[0]);
				yield walk(tuple) as typeof tuple;
			}
		},
	};
	// helper fns
	function registerPromise(promise: Promise<unknown>): TsonAsyncIndex {
		const index = promiseIndex++ as TsonAsyncIndex;
		promises.set(
			index,
			promise
				.then((result) => {
					const tuple: TsonAsyncValueTuple = [index, PROMISE_RESOLVED, result];
					return tuple;
				})
				//        ^?
				.catch((err) => {
					const tuple: TsonAsyncValueTuple = [
						index,
						PROMISE_REJECTED,
						new TsonPromiseRejectionError(err),
					];

					return tuple;
				}),
		);

		return index;
	}

	const handlers = (() => {
		const all = types.map((handler) => {
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
		type Handler = (typeof all)[number];

		const byPrimitive: Partial<
			Record<TsonAllTypes, Extract<Handler, TsonTypeTesterPrimitive>>
		> = {};
		const nonPrimitive: Extract<Handler, TsonTypeTesterCustom>[] = [];

		for (const handler of all) {
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
					throw new TsonCircularReferenceError(value);
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

	return [walk, iterator] as const;
}

type TsonAsyncSerializer = <T>(
	value: T,
) => [TsonSerialized<T>, AsyncIterable<TsonAsyncValueTuple>];

export function createAsyncTsonSerialize(
	opts: TsonAsyncOptions,
): TsonAsyncSerializer {
	return (value) => {
		const nonce: TsonNonce = opts.nonce
			? (opts.nonce() as TsonNonce)
			: getNonce();
		const [walk, iterator] = walkerFactory(nonce, opts.types);

		return [
			{
				json: walk(value),
				nonce,
			} as TsonSerialized<typeof value>,
			iterator,
		];
	};
}

export function createAsyncTsonStringify(
	opts: TsonAsyncOptions,
): TsonAsyncStringifier {
	const indent = (length: number) => " ".repeat(length);
	const stringifier: (value: unknown, space?: number) => AsyncIterable<string> =
		async function* stringify(value, space = 0) {
			// head looks like

			// [
			// 		{ json: {}, nonce: "..." }
			//  	,[

			const [head, iterator] = createAsyncTsonSerialize(opts)(value);

			// first line of the json: init the array, ignored when parsing>
			yield "[";
			// second line: the shape of the json - used when parsing>
			yield indent(space * 1) + JSON.stringify(head);

			// third line: comma before values, ignored when parsing
			yield indent(space * 1) + ",";
			// fourth line: the values array, ignored when parsing
			yield indent(space * 1) + "[";

			let isFirstStreamedValue = true;
			for await (const value of iterator) {
				const prefix = indent(space * 2) + (isFirstStreamedValue ? "" : ",");

				yield prefix + JSON.stringify(value);

				isFirstStreamedValue = false;
			}

			yield indent(space * 1) + "]"; // end value array
			yield "]"; // end response
		};

	return stringifier as TsonAsyncStringifier;
}
