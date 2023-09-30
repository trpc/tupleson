import { expect } from "vitest";

import {
	tsonDeserializer,
	tsonParser,
	tsonSerializer,
	tsonStringifier,
} from "./tson.js";
import { TsonOptions } from "./types.js";

export const expectError = (fn: () => unknown) => {
	let err: unknown;
	try {
		fn();
	} catch (_err) {
		err = _err;
	}

	expect(err).toBeDefined();
	expect(err).toBeInstanceOf(Error);
	return err as Error;
};
