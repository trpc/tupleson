import { TsonAsyncOptions } from "./asyncTypes.js";
import {
	createAsyncTsonSerializer,
	createAsyncTsonStringifier,
} from "./serializeAsync.js";

export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	serialize: createAsyncTsonSerializer(opts),
	stringify: createAsyncTsonStringifier(opts),
});
