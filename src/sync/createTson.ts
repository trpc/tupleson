import { createTsonDeserialize, createTsonParser } from "./deserialize.js";
import { createTsonSerialize, createTsonStringify } from "./serialize.js";
import { TsonOptions } from "./syncTypes.js";

export const createTson = (opts: TsonOptions) => ({
	deserialize: createTsonDeserialize(opts),
	parse: createTsonParser(opts),
	serialize: createTsonSerialize(opts),
	stringify: createTsonStringify(opts),
});
