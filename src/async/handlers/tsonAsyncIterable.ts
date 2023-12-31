import {
	TsonAbortError,
	TsonPromiseRejectionError,
	TsonStreamInterruptedError,
} from "../asyncErrors.js";
import { TsonAsyncType } from "../asyncTypes.js";

const ITERATOR_VALUE = 0;
const ITERATOR_ERROR = 1;
const ITERATOR_DONE = 2;
type SerializedIterableResult =
	| [typeof ITERATOR_DONE]
	| [typeof ITERATOR_ERROR, unknown]
	| [typeof ITERATOR_VALUE, unknown];
function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
	return (
		!!value &&
		typeof value === "object" &&
		typeof (value as any)[Symbol.asyncIterator] === "function"
	);
}

export const tsonAsyncIterable: TsonAsyncType<
	AsyncIterable<unknown>,
	SerializedIterableResult
> = {
	async: true,
	deserialize: (opts) => {
		return (async function* generator() {
			let next: Awaited<ReturnType<(typeof opts.reader)["read"]>>;

			while (((next = await opts.reader.read()), !next.done)) {
				const { value } = next;
				if (value instanceof TsonStreamInterruptedError) {
					if (value.cause instanceof TsonAbortError) {
						opts.close();
						return;
					}

					throw value;
				}

				switch (value[0]) {
					case ITERATOR_DONE: {
						opts.close();
						return;
					}

					case ITERATOR_ERROR: {
						opts.close();
						throw TsonPromiseRejectionError.from(value[1]);
					}

					case ITERATOR_VALUE: {
						yield value[1];
						break; // <-- breaks the switch, not the loop
					}
				}
			}
		})();
	},
	key: "AsyncIterable",
	serializeIterator: async function* serialize(opts) {
		try {
			for await (const value of opts.value) {
				yield [ITERATOR_VALUE, value];
			}

			yield [ITERATOR_DONE];
		} catch (err) {
			yield [ITERATOR_ERROR, err];
		}
	},
	test: isAsyncIterable,
};
