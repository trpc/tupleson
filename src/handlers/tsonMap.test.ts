import { expect, test } from "vitest";

import { createTson } from "../index.js";
import { tsonMap } from "./index.js";

test("Map", () => {
	const t = createTson({
		types: [tsonMap],
	});

	const expected = new Map([["a", "b"]]);

	const stringified = t.stringify(expected);
	const deserialized = t.parse(stringified);
	expect(deserialized).toEqual(expected);
});
