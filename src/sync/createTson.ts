/* eslint-disable eslint-comments/disable-enable-pair */

import { createTsonDeserialize, createTsonParser } from "./deserialize.js";
import { TsonOptions } from "../types.js";
import { createTsonSerialize, createTsonStringify } from "./serialize.js";

export const createTson = (opts: TsonOptions) => ({
	deserialize: createTsonDeserialize(opts),
	parse: createTsonParser(opts),
	serialize: createTsonSerialize(opts),
	stringify: createTsonStringify(opts),
});
