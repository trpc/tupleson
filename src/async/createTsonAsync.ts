import { TsonAsyncOptions } from "./asyncTypes.js";
import {
	createAsyncTsonSerialize,
	createAsyncTsonStringify,
} from "./serializeAsync.js";

export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	serialize: createAsyncTsonSerialize(opts),
	stringify: createAsyncTsonStringify(opts),
});
