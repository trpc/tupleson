import { Decimal } from "decimal.js";
import { expect, test } from "vitest";

import { TsonType, createTson } from "../index.js";

const decimaljs: TsonType<Decimal, string> = {
	deserialize: (v) => new Decimal(v),
	key: "Decimal",
	serialize: (v) => v.toJSON(),
	test: (v) => v instanceof Decimal,
};

const tson = createTson({
	types: [decimaljs],
});

test("Decimal.js", () => {
	const expected = new Decimal(1.23);
	const serialized = tson.serialize(expected);

	expect(serialized).toMatchInlineSnapshot(`
		{
		  "json": [
		    "Decimal",
		    "1.23",
		    "__tson",
		  ],
		  "nonce": "__tson",
		}
	`);

	const deserialized = tson.deserialize(serialized);

	expect(deserialized).toEqual(expected);
});
