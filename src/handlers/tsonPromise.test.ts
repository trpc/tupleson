import { test } from "vitest";

import { createTson, createTsonAsync, tsonPromise } from "../index.js";

test("tsonPromise", async () => {
	const tson = createTsonAsync({
		types: [tsonPromise],
	});

	const promise = Promise.resolve(42);

	const serialized = tson.stringify(promise);
	const deserialized = tson.parse(serialized);
});
