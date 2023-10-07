import {
	TsonPromiseRejectionError,
	TsonStreamInterruptedError,
} from "../../errors.js";
import { TsonAsyncType } from "../asyncTypes.js";

const ITERATOR_VALUE = 0;
const ITERATOR_ERROR = 1;
const ITERATOR_DONE = 2;
type SerializedIteratorResult =
	| [typeof ITERATOR_DONE]
	| [typeof ITERATOR_ERROR, unknown]
	| [typeof ITERATOR_VALUE, unknown];
function isAsyncIterator(value: unknown): value is AsyncIterable<unknown> {
	return (
		!!value &&
		typeof value === "object" &&
		typeof (value as any)[Symbol.asyncIterator] === "function"
	);
}

export const tsonAsyncIterator: TsonAsyncType<
	AsyncIterable<unknown>,
	SerializedIteratorResult
> = {
	async: true,
	deserialize: (opts) => {
		return (async function* generator() {
			let next: Awaited<ReturnType<(typeof opts.reader)["read"]>>;

			while (((next = await opts.reader.read()), !next.done)) {
				if (next.value instanceof TsonStreamInterruptedError) {
					throw TsonPromiseRejectionError.from(next);
				}

				switch (next.value[0]) {
					case ITERATOR_DONE: {
						opts.controller.close();
						return;
					}

					case ITERATOR_ERROR: {
						opts.controller.close();
						throw TsonPromiseRejectionError.from(next.value[1]);
					}

					case ITERATOR_VALUE: {
						yield next.value[1];
						break;
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
	test: isAsyncIterator,
};
