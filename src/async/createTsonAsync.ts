import { TsonAsyncOptions } from "./asyncTypes.js";
import { createTsonParseAsync } from "./deserializeAsync.js";
import { createTsonStringifyAsync } from "./serializeAsync.js";

export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	parse: createTsonParseAsync(opts),
	stringify: createTsonStringifyAsync(opts),
});
