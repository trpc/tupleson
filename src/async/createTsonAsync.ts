import { TsonAsyncOptions } from "./asyncTypes.js";
import {
	createTsonParseAsync,
	createTsonParseEventSource,
	createTsonParseJsonStreamResponse,
} from "./deserializeAsync.js";
import {
	createTsonSSEResponse,
	createTsonSerializeJsonStreamResponse,
	createTsonStreamAsync,
} from "./serializeAsync.js";

/**
 * Only used for testing - when using the async you gotta pick which one you want
 * @internal
 */
export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	createEventSource: createTsonParseEventSource(opts),
	fromJsonStreamResponse: createTsonParseJsonStreamResponse(opts),
	parseJsonStream: createTsonParseAsync(opts),
	stringifyJsonStream: createTsonStreamAsync(opts),
	toJsonStreamResponse: createTsonSerializeJsonStreamResponse,
	toSSEResponse: createTsonSSEResponse(opts),
});
