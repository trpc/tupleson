import { createAcyclicCacheRegistrar } from "../internals/createAcyclicCacheRegistrar.js";
import { GetNonce, getDefaultNonce } from "../internals/getNonce.js";
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
	TsonType,
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

	function runGuards(value: unknown) {
		for (const guard of opts.guards ?? []) {
			const isOk = guard.assert(value);
			if (typeof isOk === "boolean" && !isOk) {
				throw new Error(`Guard ${guard.key} failed on value ${String(value)}`);
			}
		}
	}

	return [getNonce, customs, primitives, runGuards] as const;
}

export function createTsonStringify(opts: TsonOptions): TsonStringifyFn {
	const serializer = createTsonSerialize(opts);

	return ((obj: unknown, space?: number | string) =>
		JSON.stringify(serializer(obj), null, space)) as TsonStringifyFn;
}

export function createTsonSerialize(opts: TsonOptions): TsonSerializeFn {
	const [getNonce, nonPrimitives, primitives, runGuards] = getHandlers(opts);

	const walker: WalkerFactory = (nonce) => {
		// create a persistent cache shared across recursions
		const register = createAcyclicCacheRegistrar();

		const walk: WalkFn = (value) => {
			const cacheAndReturn = register(value);
			const primitiveHandler = primitives.get(typeof value);

			let handler: TsonType<any, any> | undefined;

			// primitive handlers take precedence
			if (!primitiveHandler?.test || primitiveHandler.test(value)) {
				handler = primitiveHandler;
			}

			// first passing handler wins
			handler ??= [...nonPrimitives].find((handler) => handler.test(value));

			/* If we have a handler, cache and return a TSON tuple for
			the result of recursively walking the serialized value */
			if (handler) {
				return cacheAndReturn(recurseWithHandler(handler, value));
			}

			// apply guards to unhanded values
			runGuards(value);

			// recursively walk children
			return cacheAndReturn(mapOrReturn(value, walk));
		};

		return walk;

		function recurseWithHandler(
			handler:
				| (TsonTypeTesterCustom & TsonMarshaller<any, any>)
				| (TsonTypeTesterPrimitive & TsonMarshaller<any, any>),
			v: unknown,
		) {
			return [
				handler.key as TsonTypeHandlerKey,
				walk(handler.serialize(v)),
				nonce,
			] as TsonTuple;
		}
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
