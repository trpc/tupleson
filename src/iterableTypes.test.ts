import * as v from "vitest";

import { AsyncGenerator, Generator } from "./iterableTypes.js";

v.describe("Async Iterable Types", () => {
	v.it("should be interchangeable with the original type signatures", () => {
		const generator = (async function* () {
			await Promise.resolve();
			yield 1;
			yield 2;
			yield 3;
		})();

		v.expectTypeOf(generator).toMatchTypeOf<AsyncGenerator<number>>();
	});
});

v.describe("Iterable Types", () => {
	v.it("should be interchangeable with the original type signatures", () => {
		const generator = (function* () {
			yield 1;
			yield 2;
			yield 3;
		})();

		v.expectTypeOf(generator).toMatchTypeOf<Generator<number>>();
	});
});
