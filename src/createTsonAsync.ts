import {
	createAsyncTsonSerializer,
	createAsyncTsonStringifier,
} from "./serializeAsync.js";
import { TsonAsyncOptions } from "./types.js";

export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	serialize: createAsyncTsonSerializer(opts),
	stringify: createAsyncTsonStringifier(opts),
});
