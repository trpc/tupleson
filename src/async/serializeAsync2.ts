import { GetNonce, getDefaultNonce } from "../internals/getNonce.js";
import { isComplexValue } from "../internals/isComplexValue.js";
import {
	TsonAllTypes,
	TsonNonce,
	TsonType,
	TsonTypeTesterCustom,
	TsonTypeTesterPrimitive,
} from "../sync/syncTypes.js";
import {
	ChunkTypes,
	TsonAsyncBodyTuple,
	TsonAsyncChunk,
	TsonAsyncHeadTuple,
	TsonAsyncOptions,
	TsonAsyncReferenceTuple,
	TsonAsyncTailTuple,
	TsonAsyncTuple,
	TsonAsyncType,
	TsonStatus,
} from "./asyncTypes2.js";
import { isAsyncIterableEsque, isIterableEsque } from "./iterableUtils.js";

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

	function applyGuards(value: unknown) {
		for (const guard of opts.guards ?? []) {
			const isOk = guard.assert(value);
			if (typeof isOk === "boolean" && !isOk) {
				throw new Error(`Guard ${guard.key} failed on value ${String(value)}`);
			}
		}
	}

	return [getNonce, { asyncs, primitives, syncs }, applyGuards] as const;
}

// Serializer factory function
export function createTsonSerializeAsync(opts: TsonAsyncOptions) {
	let currentId = 0;
	const objectCache = new WeakMap<object, `${TsonNonce}${number}`>();
	/**
	 * A cache of running iterators mapped to their header tuple.
	 * When a head is emitted for an iterator, it is added to this map.
	 * When the iterator is done, a tail is emitted and the iterator is removed from the map.
	 */
	const workerMap = new WeakMap<
		TsonAsyncHeadTuple,
		// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
		AsyncGenerator<TsonAsyncChunk, number | undefined | void, undefined>
	>();

	const queue = new Map<`${TsonNonce}${number}`, Promise<TsonAsyncTuple>>();
	const [getNonce, handlers, applyGuards] = getHandlers(opts);
	const nonce = getNonce();
	const getNextId = () => `${nonce}${currentId++}` as const;

	const createCircularRefChunk = (
		key: null | number | string,
		value: object,
		id: `${TsonNonce}${number}`,
		parentId: `${TsonNonce}${"" | number}`,
	): TsonAsyncReferenceTuple | undefined => {
		const originalNodeId = objectCache.get(value);
		if (originalNodeId === undefined) {
			return undefined;
		}

		return [ChunkTypes.REF, [id, parentId, key], originalNodeId];
	};

	const initializeIterable = (
		source: AsyncGenerator<
			TsonAsyncChunk,
			// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
			number | undefined | void,
			undefined
		>,
	): ((head: TsonAsyncHeadTuple) => TsonAsyncHeadTuple) => {
		return (head) => {
			workerMap.set(head, source);
			const newId = getNextId();
			queue.set(
				newId,
				source.next().then(async (result) => {
					if (result.done) {
						workerMap.delete(head);
						return Promise.resolve([
							ChunkTypes.TAIL,
							[newId, head[1][0], null],
							result.value ?? TsonStatus.OK,
						] as TsonAsyncTailTuple);
					}

					addToQueue(result.value.key ?? null, result.value.chunk, head[1][0]);
					return Promise.resolve([
						ChunkTypes.BODY,
						[newId, head[1][0], null],
						head,
					] as TsonAsyncBodyTuple);
				}),
			);

			return head;
		};
	};

	const addToQueue = (
		key: null | number | string,
		value: unknown,
		parentId: `${TsonNonce}${"" | number}`,
	) => {
		const thisId = getNextId();
		if (isComplexValue(value)) {
			const circularRef = createCircularRefChunk(key, value, thisId, parentId);
			if (circularRef) {
				queue.set(circularRef[1][0], Promise.resolve(circularRef));
				return;
			}

			objectCache.set(value, thisId);
		}

		// Try to find a matching handler and initiate serialization
		const handler = selectHandler({ handlers, value });

		// fallback to parsing as json
		if (!handler) {
			applyGuards(value);

			if (isComplexValue(value)) {
				const iterator = toAsyncGenerator(value);

				queue.set(
					thisId,
					Promise.resolve([
						ChunkTypes.HEAD,
						[thisId, parentId, key],
					] as TsonAsyncHeadTuple).then(initializeIterable(iterator)),
				);

				return;
			}

			queue.set(
				thisId,
				Promise.resolve([ChunkTypes.LEAF, [thisId, parentId, key], value]),
			);

			return;
		}

		if (!handler.async) {
			queue.set(
				thisId,
				Promise.resolve([
					ChunkTypes.LEAF,
					[thisId, parentId, key],
					handler.serialize(value),
					handler.key,
				]),
			);

			return;
		}

		// Async handler
		const iterator = handler.unfold(value);

		// Ensure the head is sent before the body
		queue.set(
			thisId,
			Promise.resolve([
				ChunkTypes.HEAD,
				[thisId, parentId, key],
				handler.key,
			] as TsonAsyncHeadTuple).then(initializeIterable(iterator)),
		);
	};

	return async function* serialize(source: unknown) {
		addToQueue(null, source, `${nonce}`);

		while (queue.size > 0) {
			const chunk = await Promise.race([...queue.values()]);

			if (chunk[0] !== ChunkTypes.BODY) {
				queue.delete(chunk[1][0]);
				yield chunk;
				continue;
			}

			const headId = chunk[2][1][0];
			const chunkId = chunk[1][0];
			const chunkKey = chunk[1][2] ?? null;
			const worker = workerMap.get(chunk[2]);

			if (!worker) {
				throw new Error("Worker not found");
			}

			queue.set(
				chunkId,
				worker.next().then(async (result) => {
					if (result.done) {
						workerMap.delete(chunk[2]);
						return Promise.resolve([
							ChunkTypes.TAIL,
							[chunkId, headId, chunkKey],
							result.value ?? TsonStatus.OK,
						] as TsonAsyncTailTuple);
					}

					addToQueue(result.value.key ?? null, result.value.chunk, headId);

					return Promise.resolve([
						ChunkTypes.BODY,
						[chunkId, headId, chunkKey],
						chunk[2],
					] as TsonAsyncBodyTuple);
				}),
			);
		}
	};
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

async function* toAsyncGenerator<T extends object>(
	item: T,
): AsyncGenerator<TsonAsyncChunk, number, undefined> {
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

		code = TsonStatus.OK;
		return code;
	} catch {
		code = TsonStatus.ERROR;
		return code;
	} finally {
		code ??= TsonStatus.INCOMPLETE;
	}
}

// function typeofStruct<
// 	T extends
// 		| AsyncIterable<any>
// 		| Iterable<any>
// 		| Record<number | string, any>
// 		| any[],
// >(item: T): "array" | "iterable" | "pojo" {
// 	switch (true) {
// 		case Symbol.asyncIterator in item:
// 			return "iterable";
// 		case Array.isArray(item):
// 			return "array";
// 		case Symbol.iterator in item:
// 			return "iterable";
// 		default:
// 			// we intentionally treat functions as pojos
// 			return "pojo";
// 	}
// }

// /**
//  *  - Async iterables are iterated, and each value yielded is walked.
//  *  To be able to reconstruct the reference graph, each value is
//  *  assigned a negative-indexed label indicating both the order in
//  *  which it was yielded, and that it is a child of an async iterable.
//  *  Upon deserialization, each [key, value] pair is set as a property
//  *  on an object with a [Symbol.asyncIterator] method which yields
//  *  the values, preserving the order.
//  *
//  *  - Arrays are iterated with their indices as labels and
//  *  then reconstructed as arrays.
//  *
//  *  - Maps are iterated as objects
//  *
//  *  - Sets are iterated as arrays
//  *
//  *  - All other iterables are iterated as if they were async.
//  *
//  *  - All other objects are iterated with their keys as labels and
//  *  reconstructed as objects, effectively replicating
//  *  the behavior of `Object.fromEntries(Object.entries(obj))`
//  * @yields {TsonAsyncChunk}
//  */
// async function* toAsyncGenerator<T extends object>(
// 	item: T,
// ): AsyncGenerator<TsonAsyncChunk, number, undefined> {
// 	let code;

// 	try {
// 		if (isIterableEsque(item) || isAsyncIterableEsque(item)) {
// 			let i = 0;
// 			for await (const chunk of item) {
// 				yield {
// 					chunk,
// 					key: i++,
// 				};
// 			}
// 		} else {
// 			for (const key in item) {
// 				yield {
// 					chunk: item[key],
// 					key,
// 				};
// 			}
// 		}

// 		code = TSON_STATUS.OK;
// 		return code;
// 	} catch {
// 		code = TSON_STATUS.ERROR;
// 		return code;
// 	} finally {
// 		code ??= TSON_STATUS.INCOMPLETE;
// 	}
// }
