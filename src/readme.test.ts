import { expect, test } from "vitest";

import { tsonSet } from "./handlers/tsonSet.js";
import { createTupleson } from "./tson.js";

test("readme reference", () => {
	const json = createTupleson({
		types: [tsonSet],
	});

	const result = json.stringify(
		{
			foo: "bar",
			set: new Set([1, 2, 3]),
		},
		2,
	);

	expect(result).toMatchInlineSnapshot(`
		"{
		  \\"json\\": {
		    \\"foo\\": \\"bar\\",
		    \\"set\\": [
		      \\"Set\\",
		      [
		        1,
		        2,
		        3
		      ],
		      \\"__tson\\"
		    ]
		  },
		  \\"nonce\\": \\"__tson\\"
		}"
	`);

	console.log(result);
});
