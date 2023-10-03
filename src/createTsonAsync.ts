import { createAsyncTsonSerializer } from "./serializeAsync.js";
import { TsonAsyncOptions } from "./types.js";

export const createTsonAsync = (opts: TsonAsyncOptions) => ({
	serializeAsync: createAsyncTsonSerializer(opts),
});
