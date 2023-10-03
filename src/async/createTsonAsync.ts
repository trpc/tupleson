import { TsonAsyncOptions } from "./asyncTypes.js";
import { createAsyncTsonStringify } from "./serializeAsync.js";

export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	stringify: createAsyncTsonStringify(opts),
});
