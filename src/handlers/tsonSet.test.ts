import { expect, test } from "vitest";

import { createTupleson } from "../tson.js";
import { tsonSet } from "./tsonSet.js";

test("Set", () => {
	const t = createTupleson({
		types: [tsonSet],
	});

	const expected = new Set(["a", "b"]);

	const stringified = t.stringify(expected);
	const deserialized = t.parse(stringified);
	expect(deserialized).toEqual(expected);
});
