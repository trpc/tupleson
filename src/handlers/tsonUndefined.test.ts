import { expect, test } from "vitest";

import { createTson } from "../createTson.js";
import { tsonUndefined } from "./index.js";

test("undefined", () => {
	const ctx = createTson({
		types: [tsonUndefined],
	});

	const expected = {
		foo: [1, undefined, 2],
	} as const;
	const stringified = ctx.stringify(expected);
	const deserialized = ctx.parse(stringified);

	expect(deserialized).toEqual(expected);
});
