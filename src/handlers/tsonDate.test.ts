import { expect, test } from "vitest";
import { createTupleson } from "../tson.js";
import { tsonDate } from "./tsonDate.js";

test("Date", () => {
	const ctx = createTupleson({
		types: {
			Date: tsonDate,
		},
	});

	const date = new Date();

	const stringified = ctx.stringify(date);
	const deserialized = ctx.parse(stringified);
	expect(deserialized).toEqual(date);
});
