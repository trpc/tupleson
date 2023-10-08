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

type WalkFn = (value: unknown, path?: (string|number)[]) => unknown;
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
		const seen = new Map<string, unknown>();
		const backrefs: [circular_key: string, origin_key: string][] = [];
		
		const coreWalk: WalkFn = (value, path = []) => {
			const key = path.join(nonce);
			if (isTsonTuple(value, nonce)) {
				const [type, serializedValue] = value;
				if (type === 'CIRCULAR') {
					backrefs.push([key, serializedValue as string]);
					return;
				}
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const transformer = typeByKey[type]!;
				const parsed = transformer.deserialize(coreWalk(serializedValue, path));
				seen.set(key, parsed);
				return parsed;
			}

			const parsed = mapOrReturn(value, (value, key) => coreWalk(value, [...path, key]));
			if (parsed && typeof parsed === 'object') {
				seen.set(key, parsed)
			}
			return parsed;
		};

		const walk: WalkFn = (value) => {
			const res = coreWalk(value);
			for (const [key, ref] of backrefs) {
				const prev = seen.get(ref);
				if (!prev) {
					throw new Error(`Back-reference ${ref.split(nonce).join('.')} not found`);
				}
				const path = key.split(nonce);
				let insertAt = res as any
				try {
					while (path.length > 1) {
						insertAt = insertAt[path.shift()!];
					}
					insertAt[path[0]!] = prev
				} catch (cause) {
					throw new Error(`Invalid path to back-reference ${ref.split(nonce).join('.')}`, { cause });
				}
			}
			return res
		}

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
