import {
	TsonPromiseRejectionError,
	TsonStreamInterruptedError,
} from "../asyncErrors.js";
import { TsonAsyncType } from "../asyncTypes.js";

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
				const next = await opts.reader.read();
				opts.close();

				if (next.done) {
					throw new TsonPromiseRejectionError(
						"Expected promise value, got done",
					);
				}

				const { value } = next;

				if (value instanceof TsonStreamInterruptedError) {
					reject(TsonPromiseRejectionError.from(value));
					return;
				}

				const [status, result] = value;

				status === PROMISE_RESOLVED
					? resolve(result)
					: reject(TsonPromiseRejectionError.from(result));
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
			yield await value;
		})();
	},
	test: isPromise,
};
