import { TsonAsyncOptions } from "./asyncTypes.js";
import { createTsonParseAsync } from "./deserializeAsync.js";
import { createTsonStringifyAsync } from "./serializeAsync.js";

/**
 * @internal
 *
 * Only used for testing - when using the async you gotta pick which one you want
 */
export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	parse: createTsonParseAsync(opts),
	stringify: createTsonStringifyAsync(opts),
});
