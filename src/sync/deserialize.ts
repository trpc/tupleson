import { isTsonTuple } from "../internals/isTsonTuple.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonDeserializeFn,
	TsonNonce,
	TsonOptions,
	TsonParseFn,
	TsonSerialized,
	TsonTransformerSerializeDeserialize,
} from "./syncTypes.js";

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
		walker(obj._nonce)(obj.json)) as TsonDeserializeFn;
}

export function createTsonParser(opts: TsonOptions): TsonParseFn {
	const deserializer = createTsonDeserialize(opts);

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

	return ((str: string) => {
		let nonce = "";
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return JSON.parse(str, (key, value) => {
			if (!nonce && key === "_nonce") {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				nonce = value;
			}

			if (!nonce) {
				throw new Error("No nonce found");
			}

			if (isTsonTuple(value, nonce)) {
				const [type, serializedValue] = value;
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const transformer = typeByKey[type]!;
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return transformer.deserialize(serializedValue);
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return value;
		}).json;
	}) as TsonParseFn;
}
