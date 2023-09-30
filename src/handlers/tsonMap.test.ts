import { expect, test } from "vitest";

import { createTupleson } from "../tson.js";
import { tsonMap } from "./tsonMap.js";

test("Map", () => {
	const t = createTupleson({
		types: [tsonMap],
	});

	const expected = new Map([["a", "b"]]);

	const stringified = t.stringify(expected);
	const deserialized = t.parse(stringified);
	expect(deserialized).toEqual(expected);
});
