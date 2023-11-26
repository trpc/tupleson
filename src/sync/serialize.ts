import { TsonCircularReferenceError } from "../errors.js";
import { GetNonce, getDefaultNonce } from "../internals/getNonce.js";
import { isComplexValue } from "../internals/isComplexValue.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonAllTypes,
	TsonMarshaller,
	TsonNonce,
	TsonOptions,
	TsonSerializeFn,
	TsonSerialized,
	TsonStringifyFn,
	TsonTuple,
	TsonTypeHandlerKey,
	TsonTypeTesterCustom,
	TsonTypeTesterPrimitive,
} from "./syncTypes.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

function getHandlers(opts: TsonOptions) {
	type Handler = (typeof opts.types)[number];

	const primitives = new Map<
		TsonAllTypes,
		Extract<Handler, TsonTypeTesterPrimitive>
	>();

	const customs = new Set<Extract<Handler, TsonTypeTesterCustom>>();

	for (const marshaller of opts.types) {
		if (marshaller.primitive) {
			if (primitives.has(marshaller.primitive)) {
				throw new Error(
					`Multiple handlers for primitive ${marshaller.primitive} found`,
				);
			}

			primitives.set(marshaller.primitive, marshaller);
		} else {
			customs.add(marshaller);
		}
	}

	const getNonce = (opts.nonce ? opts.nonce : getDefaultNonce) as GetNonce;

	const guards = opts.guards ?? [];

	return [getNonce, customs, primitives, guards] as const;
}

export function createTsonStringify(opts: TsonOptions): TsonStringifyFn {
	const serializer = createTsonSerialize(opts);

	return ((obj: unknown, space?: number | string) =>
		JSON.stringify(serializer(obj), null, space)) as TsonStringifyFn;
}

export function createTsonSerialize(opts: TsonOptions): TsonSerializeFn {
	const [getNonce, nonPrimitives, primitives, guards] = getHandlers(opts);

	const walker: WalkerFactory = (nonce) => {
		const seen = new WeakSet();
		const cache = new WeakMap<object, unknown>();

		const walk: WalkFn = (value: unknown) => {
			const type = typeof value;
			const isComplex = isComplexValue(value);

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

			const primitiveHandler = primitives.get(type);
			if (
				primitiveHandler &&
				(!primitiveHandler.test || primitiveHandler.test(value))
			) {
				return cacheAndReturn(toTuple(value, primitiveHandler));
			}

			for (const handler of nonPrimitives) {
				if (handler.test(value)) {
					return cacheAndReturn(toTuple(value, handler));
				}
			}

			for (const guard of guards) {
				//				if ("assert" in guard) {
				guard.assert(value);
				//				}
				//todo: if this is implemented does it go before or after assert?
				// if ("parse" in guard) {
				// 	value = guard.parse(value);
				// }
			}

			return cacheAndReturn(mapOrReturn(value, walk));
		};

		return walk;

		function toTuple(
			v: unknown,
			handler:
				| (TsonTypeTesterCustom & TsonMarshaller<any, any>)
				| (TsonTypeTesterPrimitive & Partial<TsonMarshaller<any, any>>),
		) {
			return [
				handler.key as TsonTypeHandlerKey,
				walk(handler.serialize?.(v)),
				nonce,
			] as TsonTuple;
		}

		// 	if (!handler) {
		// 		return mapOrReturn(value, walk);
		// 	}

		// 	if (!isComplexValue(value)) {
		// 		return toTuple(value, handler);
		// 	}

		// 	// if this is a value-by-reference we've seen before, either:
		// 	//  - We've serialized & cached it before and can return the cached value
		// 	//  - We're attempting to serialize it, but one of its children is itself (circular reference)
		// 	if (cache.has(value)) {
		// 		return cache.get(value);
		// 	}

		// 	if (seen.has(value)) {
		// 		throw new TsonCircularReferenceError(value);
		// 	}

		// 	seen.add(value);

		// 	const tuple = toTuple(value, handler);

		// 	cache.set(value, tuple);

		// 	return tuple;
		// };

		// return walk;
	};

	return ((obj): TsonSerialized => {
		const nonce = getNonce();
		const json = walker(nonce)(obj);

		return {
			json,
			nonce,
		} as TsonSerialized<any>;
	}) as TsonSerializeFn;
}
