import { TsonAsyncOptions } from "./asyncTypes.js";
import { createTsonParseAsync } from "./deserializeAsync.js";
import { createTsonStreamAsync } from "./serializeAsync.js";

/**
 * @internal
 *
 * Only used for testing - when using the async you gotta pick which one you want
 */
export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	parseJsonStream: createTsonParseAsync(opts),
	stringifyJsonStream: createTsonStreamAsync(opts),
});
