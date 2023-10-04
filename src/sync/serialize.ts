import { TsonCircularReferenceError } from "../errors.js";
import { GetNonce, getNonce } from "../internals/getNonce.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonAllTypes,
	TsonNonce,
	TsonOptions,
	TsonSerializeFn,
	TsonSerialized,
	TsonSerializedValue,
	TsonStringifyFn,
	TsonTuple,
	TsonTypeHandlerKey,
	TsonTypeTesterCustom,
	TsonTypeTesterPrimitive,
} from "../types.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

export function createTsonStringify(opts: TsonOptions): TsonStringifyFn {
	const serializer = createTsonSerialize(opts);

	return ((obj: unknown, space?: number | string) =>
		JSON.stringify(serializer(obj), null, space)) as TsonStringifyFn;
}

export function createTsonSerialize(opts: TsonOptions): TsonSerializeFn {
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
						walk(handler.serialize(value)),
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

	const walker: WalkerFactory = (nonce) => {
		const seen = new WeakSet();
		const cache = new WeakMap<object, unknown>();

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

		return walk;
	};

	const nonceFn: GetNonce = opts.nonce ? (opts.nonce as GetNonce) : getNonce;

	return ((obj): TsonSerialized => {
		const nonce = nonceFn();

		const json = walker(nonce)(obj);

		return {
			json,
			nonce,
		} as TsonSerialized<any>;
	}) as TsonSerializeFn;
}
