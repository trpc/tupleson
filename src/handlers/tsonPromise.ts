import { TsonAsyncType } from "../async/asyncTypes.js";
import { TsonPromiseRejectionError } from "../errors.js";

function isPromise(value: unknown): value is Promise<unknown> {
	return (
		!!value &&
		typeof value === "object" &&
		"then" in value &&
		typeof (value as any).catch === "function"
	);
}

const PROMISE_RESOLVED = 0;
const PROMISE_REJECTED = 1;

type SerializedPromiseValue =
	| [typeof PROMISE_REJECTED, unknown]
	| [typeof PROMISE_RESOLVED, unknown];

type MyPromise = Promise<unknown>;

export const tsonPromise: TsonAsyncType<MyPromise, SerializedPromiseValue> = {
	async: true,
	deserialize: (opts) => {
		const promise = new Promise((resolve, reject) => {
			async function _handle() {
				const value = await opts.stream[Symbol.asyncIterator]().next();

				if (value.done) {
					throw new Error("Expected promise value, got done");
				}

				const [status, result] = value.value;

				status === PROMISE_RESOLVED
					? resolve(result as any)
					: reject(TsonPromiseRejectionError.from(result));

				opts.onDone();
			}

			void _handle().catch(reject);
		});

		promise.catch(() => {
			// prevent unhandled promise rejection
		});
		return promise;
	},
	key: "Promise",
	serializeIterator(opts) {
		const value = opts.value
			.then((value): SerializedPromiseValue => [PROMISE_RESOLVED, value])
			.catch((err): SerializedPromiseValue => [PROMISE_REJECTED, err]);
		return (async function* generator() {
			// console.log("serializing", opts.value);
			yield await value;
		})();
	},
	test: isPromise,
};

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
				opts.onDone();
			}
		})();
	},
	key: "AsyncIterator",
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
