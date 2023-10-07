import { expect, test } from "vitest";

import {
	createTson,
	tsonBigint,
	tsonMap,
	tsonSet,
	tsonUndefined,
} from "../index.js";

test("lets have a look at the stringified output", () => {
	const t = createTson({
		nonce: () => "__tson",
		types: [tsonMap, tsonSet, tsonBigint, tsonUndefined],
	});

	const expected = new Set([
		//
		1,
		"string",
		undefined,
		null,
		true,
		false,
		1n,
		new Map([["foo", "bar"]]),
	]);

	const stringified = t.stringify(expected, 2);

	expect(stringified).toMatchInlineSnapshot(`
		"{
		  \\"json\\": [
		    \\"Set\\",
		    [
		      1,
		      \\"string\\",
		      [
		        \\"undefined\\",
		        0,
		        \\"__tson\\"
		      ],
		      null,
		      true,
		      false,
		      [
		        \\"bigint\\",
		        \\"1\\",
		        \\"__tson\\"
		      ],
		      [
		        \\"Map\\",
		        [
		          [
		            \\"foo\\",
		            \\"bar\\"
		          ]
		        ],
		        \\"__tson\\"
		      ]
		    ],
		    \\"__tson\\"
		  ],
		  \\"nonce\\": \\"__tson\\"
		}"
	`);

	const deserialized = t.parse(stringified);

	expect(deserialized).toEqual(expected);
});
