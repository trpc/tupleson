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

type WalkFn = (value: unknown, path?: (number | string)[]) => unknown;
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
		const references: [copyKey: string, originKey: string][] = [];

		const coreWalk: WalkFn = (value, path = []) => {
			const key = path.join(nonce);
			if (isTsonTuple(value, nonce)) {
				const [type, serializedValue] = value;
				if (type === "CIRCULAR") {
					references.push([key, serializedValue as string]);
					return nonce;
				}

				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const transformer = typeByKey[type]!;
				const parsed = transformer.deserialize(
					coreWalk(serializedValue, path),
				) as unknown;
				seen.set(key, parsed);
				return parsed;
			}

			const parsed = mapOrReturn(value, (value, key) =>
				coreWalk(value, [...path, key]),
			);
			if (parsed && typeof parsed === "object") {
				seen.set(key, parsed);
			}

			return parsed;
		};

		const walk: WalkFn = (value) => {
			const res = coreWalk(value);
			for (const [copyKey, originKey] of references) {
				const prev = seen.get(originKey);
				if (!prev) {
					throw new Error(
						`Back-reference ${originKey.split(nonce).join(".")} not found`,
					);
				}

				const path = copyKey.split(nonce);
				let insertAt = res;
				try {
					while (path.length > 1) {
						if (insertAt instanceof Map) {
							if (path.length <= 2) {
								break;
							}

							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion -- if it passed serialization, path will have an index at this point
							const key = Array.from(insertAt.keys())[Number(path.shift()!)];
							insertAt = insertAt.get(key);
							path.shift();
						} else if (insertAt instanceof Set) {
							//@ts-expect-error -- if it passed serialization, path will have an index at this point
							insertAt = Array.from(insertAt)[path.shift()];
						} else {
							//@ts-expect-error -- insertAt is unknown and not checked, but if it passed serialization, it should be an object
							insertAt = insertAt[path.shift()];
						}
					}

					if (insertAt instanceof Map) {
						if (path.length !== 2) {
							throw new Error(
								`Invalid path to Map insertion ${copyKey
									.split(nonce)
									.join(".")}`,
							);
						}

						const mapKeys = Array.from(insertAt.keys());
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion -- if it passed serialization, path will have an index at this point
						const key = mapKeys[Number(path[0]!)];
						insertAt.set(key, prev);
					} else if (insertAt instanceof Set) {
						/**
						 * WARNING: this doesn't preserve order in the Set
						 */
						insertAt.delete(nonce);
						insertAt.add(prev);
					} else {
						//@ts-expect-error -- see above, + if it passed serialization, path should be length 1 at this point
						insertAt[path[0]] = prev;
					}
				} catch (cause) {
					throw new Error(
						`Invalid path to reference insertion ${copyKey
							.split(nonce)
							.join(".")}`,
						{ cause },
					);
				}
			}

			return res;
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
