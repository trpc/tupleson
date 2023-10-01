/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CircularReferenceError } from "./errors.js";
import { isPlainObject } from "./isPlainObject.js";
import {
	TsonAllTypes,
	TsonDeserializeFn,
	TsonNonce,
	TsonOptions,
	TsonParseFn,
	TsonSerializeFn,
	TsonSerialized,
	TsonSerializedValue,
	TsonStringifyFn,
	TsonTransformerSerializeDeserialize,
	TsonTuple,
	TsonTypeHandlerKey,
	TsonTypeTesterCustom,
	TsonTypeTesterPrimitive,
} from "./types.js";

function isTsonTuple(v: unknown, nonce: string): v is TsonTuple {
	return Array.isArray(v) && v.length === 3 && v[2] === nonce;
}

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

type AnyTsonTransformerSerializeDeserialize =
	TsonTransformerSerializeDeserialize<any, any>;

export function createTsonDeserialize(opts: TsonOptions): TsonDeserializeFn {
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

	const walker: WalkerFactory = (nonce) => {
		const walk: WalkFn = (value) => {
			if (isTsonTuple(value, nonce)) {
				const [type, serializedValue] = value;
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const transformer = typeByKey[type]!;
				return transformer.deserialize(walk(serializedValue));
			}

			return mapOrReturn(value, walk);
		};

		return walk;
	};

	return ((obj: TsonSerialized) =>
		walker(obj.nonce)(obj.json)) as TsonDeserializeFn;
}

export function createTsonParser(opts: TsonOptions): TsonParseFn {
	const deserializer = createTsonDeserialize(opts);

	return ((str: string) =>
		deserializer(JSON.parse(str) as TsonSerialized)) as TsonParseFn;
}

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
	const maybeNonce = opts.nonce;

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
	};

	return ((obj): TsonSerialized => {
		const nonce: TsonNonce =
			typeof maybeNonce === "function"
				? (maybeNonce() as TsonNonce)
				: ("__tson" as TsonNonce);

		const json = walker(nonce)(obj);

		return {
			json,
			nonce,
		} as TsonSerialized<any>;
	}) as TsonSerializeFn;
}

/**
 * Maps over an object or array, returning a new object or array with the same keys.
 * If the input is not an object or array, the input is returned.
 */
function mapOrReturn(
	input: unknown,
	fn: (val: unknown, key: number | string) => unknown,
): unknown {
	if (Array.isArray(input)) {
		return input.map(fn);
	}

	if (isPlainObject(input)) {
		const output: typeof input = {};
		for (const [key, value] of Object.entries(input)) {
			output[key] = fn(value, key);
		}

		return output;
	}

	return input;
}

export const createTson = (opts: TsonOptions) => ({
	deserialize: createTsonDeserialize(opts),
	parse: createTsonParser(opts),
	serialize: createTsonSerialize(opts),
	stringify: createTsonStringify(opts),
});
