import { isTsonTuple } from "../internals/isTsonTuple.js";
import { mapOrReturn } from "../internals/mapOrReturn.js";
import { TsonAssert, TsonGuard } from "../tsonAssert.js";
import {
	TsonDeserializeFn,
	TsonMarshaller,
	TsonNonce,
	TsonOptions,
	TsonParseFn,
	TsonSerialized,
} from "./syncTypes.js";

type WalkFn = (value: unknown) => unknown;
type WalkerFactory = (nonce: TsonNonce) => WalkFn;

type AnyTsonMarshaller = TsonMarshaller<any, any>;

export function createTsonDeserialize(opts: TsonOptions): TsonDeserializeFn {
	const typeByKey: Record<string, AnyTsonMarshaller> = {};
	const assertions: TsonGuard<unknown>[] = [];
	for (const handler of opts.types) {
		if (handler.key) {
			if (typeByKey[handler.key]) {
				throw new Error(`Multiple handlers for key ${handler.key} found`);
			}

			typeByKey[handler.key] = handler as AnyTsonMarshaller;
		}

		if ("assertion" in handler) {
			assertions.push(handler);
			continue;
		}
	}

	const walker: WalkerFactory = (nonce) => {
		const walk: WalkFn = (value) => {
			if (isTsonTuple(value, nonce)) {
				const [type, serializedValue] = value;
				for (const assert of assertions) {
					assert.assertion(value);
				}

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
