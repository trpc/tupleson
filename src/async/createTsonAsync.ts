import { TsonAsyncOptions } from "../types.js";
import {
	createAsyncTsonSerializer,
	createAsyncTsonStringifier,
} from "./serializeAsync.js";

export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	serialize: createAsyncTsonSerializer(opts),
	stringify: createAsyncTsonStringifier(opts),
});
