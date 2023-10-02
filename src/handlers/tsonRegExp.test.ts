import { expect, test } from "vitest";

import { createTson } from "../createTson.js";
import { tsonRegExp } from "./index.js";

test("regex", () => {
	const t = createTson({
		nonce: () => "__tson",
		types: [tsonRegExp],
	});

	const expected = /foo/g;

	const stringified = t.stringify(expected, 2);

	expect(stringified).toMatchInlineSnapshot(
		`
		"{
		  \\"json\\": [
		    \\"RegExp\\",
		    \\"/foo/g\\",
		    \\"__tson\\"
		  ],
		  \\"nonce\\": \\"__tson\\"
		}"
	`,
	);

	const deserialized = t.parse(stringified);

	expect(deserialized).toBeInstanceOf(RegExp);
	expect(deserialized).toMatchInlineSnapshot("/foo/g");
	expect(deserialized + "").toEqual(expected + "");
});
