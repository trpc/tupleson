import { TsonCircularReferenceError } from "../errors.js";
import { GetNonce, getDefaultNonce } from "../internals/getNonce.js";
import { isComplexValue } from "../internals/isComplexValue.js";
import {
	TsonAllTypes,
	TsonType,
	TsonTypeHandlerKey,
	TsonTypeTesterCustom,
	TsonTypeTesterPrimitive,
} from "../sync/syncTypes.js";
import {
	TsonAsyncOptions,
	TsonAsyncPath,
	TsonAsyncType,
} from "./asyncTypesNew.js";
import {
	TsonAsyncHeadTuple,
	TsonAsyncLeafTuple,
	TsonAsyncReferenceTuple,
	TsonAsyncTailTuple,
} from "./createUnfoldAsyncFn.js";
import { isAsyncIterableEsque, isIterableEsque } from "./iterableUtils.js";

const TSON_STATUS = {
	//MULTI_STATUS: 207,
	ERROR: 500,
	INCOMPLETE: 203,
	OK: 200,
} as const;

function getHandlers(opts: TsonAsyncOptions) {
	const primitives = new Map<
		TsonAllTypes,
		Extract<TsonType<any, any>, TsonTypeTesterPrimitive>
	>();

	const asyncs = new Set<TsonAsyncType<any, any>>();
	const syncs = new Set<Extract<TsonType<any, any>, TsonTypeTesterCustom>>();

	for (const marshaller of opts.types) {
		if (marshaller.primitive) {
			if (primitives.has(marshaller.primitive)) {
				throw new Error(
					`Multiple handlers for primitive ${marshaller.primitive} found`,
				);
			}

			primitives.set(marshaller.primitive, marshaller);
		} else if (marshaller.async) {
			asyncs.add(marshaller);
		} else {
			syncs.add(marshaller);
		}
	}

	const getNonce = (opts.nonce ? opts.nonce : getDefaultNonce) as GetNonce;

	const guards = opts.guards ?? [];

	return [getNonce, { asyncs, primitives, syncs }, guards] as const;
}

export const createTsonSerializeAsync = (opts: TsonAsyncOptions) => {
	const [getNonce, handlers, guards] = getHandlers(opts);

	const serializer = async function* (
		v: unknown,
	): AsyncGenerator<
		TsonAsyncHeadTuple | TsonAsyncLeafTuple | TsonAsyncReferenceTuple,
		TsonAsyncTailTuple | undefined,
		undefined
	> {
		const seen = new WeakSet();
		const cache = new WeakMap<object, TsonAsyncPath>();
		const results = new Map<TsonAsyncPath, number>();
		const queue = new Map<
			AsyncGenerator<
				{ chunk: unknown; key: number | string },
				number | undefined,
				undefined
			>,
			{
				next: Promise<
					IteratorResult<
						{
							chunk: unknown;
							key: number | string;
						},
						number | undefined
					>
				>;
				path: TsonAsyncPath;
			}
		>();

		let iter;
		let result;
		let value = v;
		let path = [getNonce()] as TsonAsyncPath;

		do {
			let cached = undefined;

			if (isComplexValue(value)) {
				if (seen.has(value)) {
					cached = cache.get(value);
					// if (!cached) {
					// 	throw new TsonCircularReferenceError(value);
					// }
				} else {
					seen.add(value);
				}
			}

			if (cached) {
				const tuple = ["ref", path, cached] satisfies TsonAsyncReferenceTuple;
				yield tuple;
			} else {
				const handler = selectHandler({ handlers, value });
				if (handler) {
					const head = [
						"head",
						path,
						handler.key as TsonTypeHandlerKey,
					] satisfies TsonAsyncHeadTuple;

					yield head;

					if ("unfold" in handler) {
						//?
						iter = handler.unfold(value);
						queue.set(iter, { next: iter.next(), path });
					} else {
						const key = path.pop() as number | string;
						iter = toAsyncGenerator({
							[key]: handler.serialize(value) as unknown,
						});
						queue.set(iter, { next: iter.next(), path }); //?
					}
				} else {
					for (const guard of guards) {
						const result = guard.assert(value);
						if (typeof result === "boolean" && !result) {
							throw new Error(
								`Guard ${guard.key} failed on value ${String(value)}`,
							);
						}
					}

					if (isComplexValue(value)) {
						const kind = typeofStruct(value);
						const head = [
							"default",
							path,
							kind === "array" ? "[]" : kind === "pojo" ? "{}" : "@@",
						] satisfies TsonAsyncHeadTuple;
						yield head;
						iter = toAsyncGenerator(value);
						queue.set(iter, { next: iter.next(), path });
					} else {
						const leaf = ["leaf", path, value] satisfies TsonAsyncLeafTuple;
						yield leaf;
					}
				}
			}

			({ iter, path, result } = await Promise.race(
				Array.from(queue.entries()).map(([iter, { next, path }]) => {
					return next.then((result) => ({ iter, path, result }));
				}),
			));

			if (result.done) {
				queue.delete(iter);
				if (isComplexValue(value)) {
					cache.set(value, path);
				}

				results.set(path, result.value ?? TSON_STATUS.OK);
				continue;
			}

			value = result.value.chunk;
			path = [...path, result.value.key];
		} while (queue.size);

		// return the results
		return [
			"tail",
			path,
			Array.from(results.entries()).reduce((acc, [path, statusCode]) => {
				return statusCode === TSON_STATUS.OK ? acc : TSON_STATUS.INCOMPLETE;
			}, 200),
		] satisfies TsonAsyncTailTuple;
	};

	return serializer;
};

function typeofStruct<
	T extends
		| AsyncIterable<any>
		| Iterable<any>
		| Record<number | string, any>
		| any[],
>(item: T): "array" | "iterable" | "pojo" {
	switch (true) {
		case Symbol.asyncIterator in item:
			return "iterable";
		case Array.isArray(item):
			return "array";
		case Symbol.iterator in item:
			return "iterable";
		default:
			// we intentionally treat functions as pojos
			return "pojo";
	}
}

/**
 *  - Async iterables are iterated, and each value yielded is walked.
 *  To be able to reconstruct the reference graph, each value is
 *  assigned a negative-indexed label indicating both the order in
 *  which it was yielded, and that it is a child of an async iterable.
 *  Upon deserialization, each [key, value] pair is set as a property
 *  on an object with a [Symbol.asyncIterator] method which yields
 *  the values, preserving the order.
 *
 *  - Arrays are iterated with their indices as labels and
 *  then reconstructed as arrays.
 *
 *  - Maps are iterated as objects
 *
 *  - Sets are iterated as arrays
 *
 *  - All other iterables are iterated as if they were async.
 *
 *  - All other objects are iterated with their keys as labels and
 *  reconstructed as objects, effectively replicating
 *  the behavior of `Object.fromEntries(Object.entries(obj))`
 * @yields {{ chunk: unknown; key: number | string; }}
 */
async function* toAsyncGenerator<T extends object>(
	item: T,
): AsyncGenerator<
	{
		chunk: unknown;
		key: number | string;
	},
	number,
	never
> {
	let code;

	try {
		if (isIterableEsque(item) || isAsyncIterableEsque(item)) {
			let i = 0;
			for await (const chunk of item) {
				yield {
					chunk,
					key: i++,
				};
			}
		} else {
			for (const key in item) {
				yield {
					chunk: item[key],
					key,
				};
			}
		}

		code = TSON_STATUS.OK;
		return code;
	} catch {
		code = TSON_STATUS.ERROR;
		return code;
	} finally {
		code ??= TSON_STATUS.INCOMPLETE;
	}
}

function selectHandler({
	handlers: { asyncs, primitives, syncs },
	value,
}: {
	handlers: {
		asyncs: Set<TsonAsyncType<any, any>>;
		primitives: Map<
			TsonAllTypes,
			Extract<TsonType<any, any>, TsonTypeTesterPrimitive>
		>;
		syncs: Set<Extract<TsonType<any, any>, TsonTypeTesterCustom>>;
	};
	value: unknown;
}) {
	let handler;
	const maybePrimitive = primitives.get(typeof value);

	if (!maybePrimitive?.test || maybePrimitive.test(value)) {
		handler = maybePrimitive;
	}

	handler ??= [...syncs].find((handler) => handler.test(value));
	handler ??= [...asyncs].find((handler) => handler.test(value));

	return handler;
}
