import {
	TsonPromiseRejectionError,
	TsonStreamInterruptedError,
} from "../asyncErrors.js";
import { TsonAsyncType } from "../asyncTypes2.js";

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
		const result = await iter.next();
		if (result.done) {
			throw new TsonStreamInterruptedError("Expected promise value, got done");
		}

		const value = result.value.chunk;
		const [status, resultValue] = value;

		if (status === PROMISE_RESOLVED) {
			return resultValue;
		}

		throw TsonPromiseRejectionError.from(resultValue);
	},
	key: "Promise",
	test: isPromise,
	unfold: async function* (source) {
		let code;

		try {
			const value = await source;
			yield { chunk: [PROMISE_RESOLVED, value] };
			code = 200;
		} catch (err) {
			yield { chunk: [PROMISE_REJECTED, err] };
			code = 200;
		} finally {
			code ??= 500;
		}

		return code;
	},
};
