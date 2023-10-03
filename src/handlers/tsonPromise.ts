import { TsonAsyncType } from "../async/asyncTypes.js";

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	return typeof value === "object" && value !== null && "then" in value;
}

export const tsonPromise: TsonAsyncType<PromiseLike<unknown>> = {
	async: true,
	deserialize: (idx, register) => register(idx),
	key: "Promise",
	serialize: (value, register) => register(value),
	test: isPromiseLike,
};
