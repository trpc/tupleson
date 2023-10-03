import { TsonAsyncOptions } from "./asyncTypes.js";
import { createTsonParseAsync } from "./deserializeAsync.js";
import { createAsyncTsonStringify } from "./serializeAsync.js";

export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	parse: createTsonParseAsync(opts),
	stringify: createAsyncTsonStringify(opts),
});
