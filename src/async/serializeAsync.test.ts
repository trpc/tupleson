import { expect, test } from "vitest";

import { tsonPromise } from "../index.js";
import { createAsyncTsonSerialize } from "./serializeAsync.js";

test("serialize promise", async () => {
	const serialize = createAsyncTsonSerialize({
		nonce: () => "__tson",
		types: [tsonPromise],
	});

	const promise = Promise.resolve(42);

	const [head, iterator] = serialize(promise);

	expect(head).toMatchInlineSnapshot(`
		{
		  "json": [
		    "Promise",
		    0,
		    "__tson",
		  ],
		  "nonce": "__tson",
		}
	`);

	const values = [];
	for await (const value of iterator) {
		values.push(value);
	}

	expect(values).toMatchInlineSnapshot(`
		[
		  [
		    0,
		    [
		      0,
		      42,
		    ],
		  ],
		]
	`);
});
