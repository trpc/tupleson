import { Temporal } from "@js-temporal/polyfill";
import { expect, test } from "vitest";

import { TsonType, createTson } from "../index.js";

const plainDate: TsonType<Temporal.PlainDate, string> = {
	deserialize: (v) => Temporal.PlainDate.from(v),
	key: "PlainDate",
	serialize: (v) => v.toString(),
	test: (v) => v instanceof Temporal.PlainDate,
};

const instant: TsonType<Temporal.Instant, string> = {
	deserialize: (v) => Temporal.Instant.from(v),
	key: "Instant",
	serialize: (v) => v.toString(),
	test: (v) => v instanceof Temporal.Instant,
};

const tson = createTson({
	nonce: () => "__tson",
	types: [plainDate, instant],
});
test("PlainDate", () => {
	const expected = Temporal.PlainDate.from("2021-01-01");

	const serialized = tson.serialize(expected);

	expect(serialized).toMatchInlineSnapshot(`
		{
		  "json": [
		    "PlainDate",
		    "2021-01-01",
		    "__tson",
		  ],
		  "nonce": "__tson",
		}
	`);
	const deserialized = tson.deserialize(serialized);

	expect(deserialized).toEqual(expected);
});

test("Instant", () => {
	const expected = Temporal.Instant.from("2021-01-01T00:00:00Z");

	const serialized = tson.serialize(expected);

	expect(serialized).toMatchInlineSnapshot(`
		{
		  "json": [
		    "Instant",
		    "2021-01-01T00:00:00Z",
		    "__tson",
		  ],
		  "nonce": "__tson",
		}
	`);
	const deserialized = tson.deserialize(serialized);

	expect(deserialized).toEqual(expected);
});
