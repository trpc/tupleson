/* eslint-disable @typescript-eslint/no-explicit-any, eslint-comments/disable-enable-pair */

import { TsonError } from "../errors.js";
import { isTsonTuple } from "../internals/isTsonTuple.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import {
	TsonNonce,
	TsonSerialized,
	TsonTransformerSerializeDeserialize,
} from "../types.js";
import {
	TsonAsyncOptions,
	TsonAsyncStringifierIterator,
} from "./asyncTypes.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

type AnyTsonTransformerSerializeDeserialize =
	TsonTransformerSerializeDeserialize<any, any>;

type TsonParseAsync = <TValue>(
	string: TsonAsyncStringifierIterator<TValue>,
) => Promise<TValue>;

export function createTsonParseAsync(opts: TsonAsyncOptions): TsonParseAsync {
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

	return async (iterator) => {
		const instance = iterator[Symbol.asyncIterator]();

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

		async function init() {
			// get first two lines of iterator

			// ignore first line as it's just a `[`
			const firstLine = await instance.next();
			if (firstLine.value !== "[") {
				throw new TsonError("Expected first line to be `[`");
			}

			// second line is the serialized payload
			const second = await instance.next();
			const secondValueParsed = JSON.parse(second.value) as TsonSerialized<any>;

			const walk = walker(secondValueParsed.nonce);
			return walk(secondValueParsed.json);
		}

		return await init().catch((cause: unknown) => {
			throw new TsonError("Failed to parse TSON stream", { cause });
		});
	};
}
