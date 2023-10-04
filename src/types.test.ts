import { expectTypeOf, test } from "vitest";

import { tsonBigint } from "./handlers/tsonBigint.js";
import { createTson } from "./sync/createTson.js";
import "./types.js";

test("types", () => {
	const t = createTson({
		types: [tsonBigint],
	});

	const expected = 1n;
	{
		const stringified = t.stringify(expected);
		//    ^?
		const parsed = t.parse(stringified);
		//    ^?
		expectTypeOf(parsed).toEqualTypeOf(expected);
	}

	{
		const serialized = t.serialize(expected);
		//    ^?
		const deserialized = t.deserialize(serialized);
		//    ^?
		expectTypeOf(deserialized).toEqualTypeOf(expected);
	}
});
