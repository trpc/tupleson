export * from "./errors.js";

// --- sync --
export { createTson } from "./sync/createTson.js";
export { createTsonDeserialize, createTsonParser } from "./sync/deserialize.js";
export { createTsonSerialize, createTsonStringify } from "./sync/serialize.js";
export type { TsonType } from "./sync/syncTypes.js";
export type { TsonOptions } from "./sync/syncTypes.js";

// type handlers
export * from "./sync/handlers/tsonBigint.js";
export * from "./sync/handlers/tsonDate.js";
export * from "./sync/handlers/tsonRegExp.js";
export * from "./sync/handlers/tsonSet.js";
export * from "./sync/handlers/tsonMap.js";
export * from "./sync/handlers/tsonUndefined.js";
export * from "./sync/handlers/tsonUnknownObjectGuard.js";
export * from "./sync/handlers/tsonNumberGuard.js";
export * from "./sync/handlers/tsonURL.js";
export * from "./sync/handlers/tsonSymbol.js";

// --- async --
export type { TsonAsyncOptions } from "./async/asyncTypes.js";
export {
	type TsonParseAsyncOptions,
	createTsonParseAsync,
	createTsonParseEventSource,
} from "./async/deserializeAsync.js";
export {
	createAsyncTsonSerialize,
	createTsonSSEResponse,
	createTsonStreamAsync,
} from "./async/serializeAsync.js";
export * from "./async/asyncErrors.js";

// type handlers
export * from "./async/handlers/tsonPromise.js";
export * from "./async/handlers/tsonAsyncIterable.js";
