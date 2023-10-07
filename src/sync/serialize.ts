import { TsonCircularReferenceError } from "../errors.js";
import { GetNonce, getNonce } from "../internals/getNonce.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonAllTypes,
	TsonNonce,
	TsonOptions,
	TsonSerializeFn,
	TsonSerialized,
	TsonStringifyFn,
	TsonTuple,
	TsonTypeTesterCustom,
	TsonTypeTesterPrimitive,
} from "./syncTypes.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

function getHandlers(opts: TsonOptions) {
	type Handler = (typeof opts.types)[number];

	const byPrimitive: Partial<
		Record<TsonAllTypes, Extract<Handler, TsonTypeTesterPrimitive>>
	> = {};
	const nonPrimitives: Extract<Handler, TsonTypeTesterCustom>[] = [];

	for (const handler of opts.types) {
		if (handler.primitive) {
			if (byPrimitive[handler.primitive]) {
				throw new Error(
					`Multiple handlers for primitive ${handler.primitive} found`,
				);
			}

			byPrimitive[handler.primitive] = handler;
		} else {
			nonPrimitives.push(handler);
		}
	}

	const nonceFn: GetNonce = opts.nonce ? (opts.nonce as GetNonce) : getNonce;

	return [nonceFn, nonPrimitives, byPrimitive] as const;
}

export function createTsonStringify(opts: TsonOptions): TsonStringifyFn {
	const serializer = createTsonSerialize(opts);

	return ((obj: unknown, space?: number | string) =>
		JSON.stringify(serializer(obj), null, space)) as TsonStringifyFn;
}

export function createTsonSerialize(opts: TsonOptions): TsonSerializeFn {
	const [getNonce, nonPrimitive, byPrimitive] = getHandlers(opts);

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
				return cacheAndReturn([
					primitiveHandler.key,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					walk(primitiveHandler.serialize!(value)),
					nonce,
				] as TsonTuple);
			}

			for (const handler of nonPrimitive) {
				if (handler.test(value)) {
					return cacheAndReturn([
						handler.key,
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						walk(handler.serialize!(value)),
						nonce,
					] as TsonTuple);
				}
			}

			return cacheAndReturn(mapOrReturn(value, walk));
		};

		return walk;
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
