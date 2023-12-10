import {
	TsonPromiseRejectionError,
	TsonStreamInterruptedError,
} from "../asyncErrors.js";
import { TsonAsyncType } from "../asyncTypesNew.js";

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

export const tsonPromise: TsonAsyncType<
	Promise<unknown>,
	SerializedPromiseValue
> = {
	async: true,
	fold: async function (iter) {
		for await (const [key, chunk] of iter) {
			if (key === PROMISE_RESOLVED) {
				return chunk;
			}

			throw TsonPromiseRejectionError.from(chunk);
		}

		throw new TsonStreamInterruptedError("Expected promise value, got done");
	},
	key: "Promise",
	test: isPromise,
	unfold: async function* (source) {
		let code;

		try {
			const value = await source;
			yield { chunk: [PROMISE_RESOLVED, value], key: "" };
			code = 200;
		} catch (err) {
			yield { chunk: [PROMISE_REJECTED, err], key: "" };
			code = 200;
		} finally {
			code ??= 500;
		}

		return code;
	},
};

// 	fold: (opts) => {
// 		const promise = new Promise((resolve, reject) => {
// 			async function _handle() {
// 				const next = await opts.reader.read();
// 				opts.close();

// 				if (next.done) {
// 					throw new TsonPromiseRejectionError(
// 						"Expected promise value, got done",
// 					);
// 				}

// 				const { value } = next;

// 				if (value instanceof TsonStreamInterruptedError) {
// 					reject(TsonPromiseRejectionError.from(value));
// 					return;
// 				}

// 				const [status, result] = value;

// 				status === PROMISE_RESOLVED
// 					? resolve(result)
// 					: reject(TsonPromiseRejectionError.from(result));
// 			}

// 			void _handle().catch(reject);
// 		});

// 		promise.catch(() => {
// 			// prevent unhandled promise rejection
// 		});
// 		return promise;
// 	},

// 	unfold(opts) {
// 		const value = opts.value
// 			.then((value): SerializedPromiseValue => [PROMISE_RESOLVED, value])
// 			.catch((err): SerializedPromiseValue => [PROMISE_REJECTED, err]);
// 		return (async function* generator() {
// 			yield await value;
// 		})();
// 	},
// };
