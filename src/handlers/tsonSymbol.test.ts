import { expect, test } from "vitest";

import { createTson } from "../tson.js";
import { tsonSymbol } from "./index.js";

test("symbol", () => {
	const symbol1 = Symbol("foo");
	const symbol2 = Symbol("bar");
	const ctx = createTson({
		types: [tsonSymbol(symbol1), tsonSymbol(symbol2)],
	});

	const expected = {
		foo: [symbol1, symbol2],
	} as const;
	const stringified = ctx.stringify(expected);
	const deserialized = ctx.parse(stringified);

	expect(deserialized).toEqual(expected);
});
