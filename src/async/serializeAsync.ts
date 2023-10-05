import { TsonCircularReferenceError } from "../errors.js";
import { assert } from "../internals/assert.js";
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
import {
	TsonAsyncIndex,
	TsonAsyncOptions,
	TsonAsyncStringifier,
} from "./asyncTypes.js";

type WalkFn = (value: unknown) => unknown;

export type TsonAsyncValueTuple = [TsonAsyncIndex, unknown];

function walkerFactory(nonce: TsonNonce, types: TsonAsyncOptions["types"]) {
	// instance variables
	let asyncIndex = 0;
	const seen = new WeakSet();
	const cache = new WeakMap<object, unknown>();

	const iterators = new Map<TsonAsyncIndex, AsyncIterator<unknown>>();

	const iterator = {
		async *[Symbol.asyncIterator]() {
			// race all active iterators and yield next value as they come
			// when one iterator is done, remove it from the list

			// when all iterators are done, we're done

			const nextAsyncIteratorValue = new Map<
				TsonAsyncIndex,
				Promise<[TsonAsyncIndex, IteratorResult<unknown>]>
			>();

			// let _tmp = 0;

			while (iterators.size > 0) {
				// if (_tmp++ > 10) {
				// 	throw new Error("too many iterations");
				// }

				// set next cursor
				for (const [idx, iterator] of iterators) {
					if (!nextAsyncIteratorValue.has(idx)) {
						nextAsyncIteratorValue.set(
							idx,
							iterator.next().then((result) => [idx, result]),
						);
					}
				}

				const nextValues = Array.from(nextAsyncIteratorValue.values());

				const [idx, result] = await Promise.race(nextValues);

				if (result.done) {
					nextAsyncIteratorValue.delete(idx);
					iterators.delete(idx);
					continue;
				} else {
					const iterator = iterators.get(idx);

					assert(iterator, `iterator ${idx} not found`);
					nextAsyncIteratorValue.set(
						idx,
						iterator.next().then((result) => [idx, result]),
					);
				}

				const valueTuple: TsonAsyncValueTuple = [idx, walk(result.value)];
				yield valueTuple;
			}
		},
	};

	const handlers = (() => {
		const all = types.map((handler) => {
			type Serializer = (
				value: unknown,
				nonce: TsonNonce,
				walk: WalkFn,
			) => TsonSerializedValue;

			const $serialize: Serializer = handler.serializeIterator
				? (value): TsonTuple => {
						const idx = asyncIndex++ as TsonAsyncIndex;

						const iterator = handler.serializeIterator({
							// abortSignal: new AbortSignal(),
							value,
						});
						iterators.set(idx, iterator[Symbol.asyncIterator]());

						return [handler.key as TsonTypeHandlerKey, idx, nonce];
				  }
				: handler.serialize
				? (value, nonce, walk): TsonTuple => [
						handler.key as TsonTypeHandlerKey,
						walk(handler.serialize(value)),
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
			yield "[" + "\n";
			// second line: the shape of the json - used when parsing>
			yield indent(space * 1) + JSON.stringify(head) + "\n";

			// third line: comma before values, ignored when parsing
			yield indent(space * 1) + "," + "\n";
			// fourth line: the values array, ignored when parsing
			yield indent(space * 1) + "[" + "\n";

			let isFirstStreamedValue = true;

			for await (const value of iterator) {
				const prefix = indent(space * 2) + (isFirstStreamedValue ? "" : ",");

				yield prefix + JSON.stringify(value) + "\n";

				isFirstStreamedValue = false;
			}

			yield indent(space * 1) + "]" + "\n"; // end value array
			yield "]" + "\n"; // end response
		};

	return stringifier as TsonAsyncStringifier;
}
