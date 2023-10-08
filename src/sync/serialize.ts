// import { TsonCircularReferenceError } from "../errors.js";
import { GetNonce, getDefaultNonce } from "../internals/getNonce.js";
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

type WalkFn = (value: unknown, path?: (number | string)[]) => unknown;
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

	const getNonce: GetNonce = opts.nonce
		? (opts.nonce as GetNonce)
		: getDefaultNonce;

	return [getNonce, nonPrimitives, byPrimitive] as const;
}

export function createTsonStringify(opts: TsonOptions): TsonStringifyFn {
	const serializer = createTsonSerialize(opts);

	return ((obj: unknown, space?: number | string) =>
		JSON.stringify(serializer(obj), null, space)) as TsonStringifyFn;
}

export function createTsonSerialize(opts: TsonOptions): TsonSerializeFn {
	const [getNonce, nonPrimitive, byPrimitive] = getHandlers(opts);

	const walker: WalkerFactory = (nonce) => {
		const seen = new WeakMap<object, (number | string)[]>();
		const cache = new WeakMap<object, unknown>();

		const walk: WalkFn = (value, path = []) => {
			const type = typeof value;
			const isComplex = !!value && type === "object";

			const cacheAndReturn = (result: unknown) => {
				if (isComplex) {
					cache.set(value, result);
				}

				return result;
			};

			if (isComplex) {
				const prev = seen.get(value);
				if (prev) {
					return ["CIRCULAR", prev.join(nonce), nonce] as TsonTuple;
				}

				seen.set(value, path);
			}

			const primitiveHandler = byPrimitive[type];
			if (
				primitiveHandler &&
				(!primitiveHandler.test || primitiveHandler.test(value))
			) {
				return cacheAndReturn([
					primitiveHandler.key,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					walk(primitiveHandler.serialize!(value), path),
					nonce,
				] as TsonTuple);
			}

			for (const handler of nonPrimitive) {
				if (handler.test(value)) {
					return cacheAndReturn([
						handler.key,
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						walk(handler.serialize!(value), path),
						nonce,
					] as TsonTuple);
				}
			}

			return cacheAndReturn(
				mapOrReturn(value, (value, key) => walk(value, [...path, key])),
			);
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
