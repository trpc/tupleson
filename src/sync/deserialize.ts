/* eslint-disable eslint-comments/disable-enable-pair */

import { isTsonTuple } from "../internals/isTsonTuple.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonDeserializeFn,
	TsonNonce,
	TsonOptions,
	TsonParseFn,
	TsonSerialized,
	TsonTransformerSerializeDeserialize,
} from "../types.js";

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
