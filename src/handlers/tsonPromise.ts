import { TsonAsyncType } from "../types.js";

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	return typeof value === "object" && value !== null && "then" in value;
}

export const tsonPromise: TsonAsyncType<PromiseLike<unknown>> = {
	async: true,
	deserialize: () => {
		const promise = Promise.reject("Not implemented");

		return promise;
	},
	key: "Promise",
	serialize: (value, register) => register(value),
	test: isPromiseLike,
};
