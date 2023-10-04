import { TsonOptions } from "../types.js";
import { createTsonDeserialize, createTsonParser } from "./deserialize.js";
import { createTsonSerialize, createTsonStringify } from "./serialize.js";

export const createTson = (opts: TsonOptions) => ({
	deserialize: createTsonDeserialize(opts),
	parse: createTsonParser(opts),
	serialize: createTsonSerialize(opts),
	stringify: createTsonStringify(opts),
});
