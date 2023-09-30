import { assert, expect, test } from "vitest";

import { expectError } from "../testUtils.js";
import { createTupleson } from "../tson.js";
import { tsonSet } from "./tsonSet.js";
import {
	UnknownObjectGuardError,
	tsonUnknownObjectGuard,
} from "./tsonUnknownObjectGuard.js";

test("guard unwanted objects", () => {
	// Sets are okay, but not Maps
	const t = createTupleson({
		types: [
			tsonSet,
			// defined last so it runs last
			tsonUnknownObjectGuard,
		],
	});

	{
		// sets are okay
		const expected = new Set([1]);

		const stringified = t.stringify(expected);
		const deserialized = t.parse(stringified);

		expect(deserialized).toEqual(expected);
	}

	{
		// plain objects are okay
		const expected = { a: 1 };
		const stringified = t.stringify(expected);
		const deserialized = t.parse(stringified);
		expect(deserialized).toEqual(expected);
	}

	{
		// maps are not okay
		const expected = new Map([["a", 1]]);

		const err = expectError(() => t.parse(t.stringify(expected)));
		assert(err instanceof UnknownObjectGuardError);

		expect(err).toMatchInlineSnapshot(
			"[UnknownObjectGuardError: Unknown object found]",
		);
		expect(err.value).toEqual(expected);
	}
});
