import { expectTypeOf, test } from "vitest";

import { tsonBigint } from "./handlers/tsonBigint.js";
import { createTupleson } from "./tson.js";

test("types", () => {
	const t = createTupleson({
		types: {
			bigint: tsonBigint,
		},
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
		const serialized = t.serializer(expected);
		//    ^?
		const deserialized = t.deserialize(serialized);
		//    ^?
		expectTypeOf(deserialized).toEqualTypeOf(expected);
	}
});
