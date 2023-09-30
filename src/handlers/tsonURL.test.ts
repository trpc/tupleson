import { expect, test } from "vitest";

import { createTupleson } from "../tson.js";
import { tsonURL } from "./tsonURL.js";

test("URL", () => {
	const ctx = createTupleson({
		types: [tsonURL],
	});

	const expected = new URL("https://trpc.io/");
	expected.hash = "foo";
	expected.pathname = "sponsor";

	const stringified = ctx.stringify(expected, 2);

	expect(stringified).toMatchInlineSnapshot(
		`
		"{
		  \\"json\\": [
		    \\"URL\\",
		    \\"https://trpc.io/sponsor#foo\\",
		    \\"__tson\\"
		  ],
		  \\"nonce\\": \\"__tson\\"
		}"
	`,
	);
	const deserialized = ctx.parse(stringified);
	expect(deserialized).toEqual(expected);
});
