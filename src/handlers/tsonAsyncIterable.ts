import { TsonAsyncType } from "../async/asyncTypes.js";
import { TsonPromiseRejectionError } from "../errors.js";

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
			try {
				for await (const value of opts.stream) {
					switch (value[0]) {
						case ITERATOR_DONE: {
							return;
						}

						case ITERATOR_ERROR: {
							throw TsonPromiseRejectionError.from(value[1]);
						}

						case ITERATOR_VALUE: {
							yield value[1];
							break;
						}
					}
				}
			} finally {
				// `onDone` is a hack and shouldn't be needed
				opts.onDone();
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
