import { TsonAsyncOptions } from "./asyncTypes.js";
import {
	createTsonParseAsync,
	createTsonParseEventSource,
} from "./deserializeAsync.js";
import {
	createTsonSSEResponse,
	createTsonStreamAsync,
} from "./serializeAsync.js";

/**
 * Only used for testing - when using the async you gotta pick which one you want
 * @internal
 */
export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	createEventSourceParser: createTsonParseEventSource(opts),
	parseJsonStream: createTsonParseAsync(opts),
	stringifyJsonStream: createTsonStreamAsync(opts),
	toSSEResponse: createTsonSSEResponse(opts),
});
