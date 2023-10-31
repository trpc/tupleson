import * as v from "vitest";

import {
	AsyncGenerator,
	AsyncIterable,
	AsyncIterableIterator,
	Generator,
	Iterable,
	IterableIterator,
} from "./iterableTypes.js";

v.describe("Async Iterable Types", () => {
	v.it("should be interchangeable with the original type signatures", () => {
		const generator = (async function* () {
			await Promise.resolve();
			yield 1;
			yield 2;
			yield 3;
		})();

		v.expectTypeOf(generator).toMatchTypeOf<AsyncGenerator<number>>();

		const iterable = {
			[Symbol.asyncIterator]: () => generator,
		};

		v.expectTypeOf(iterable).toMatchTypeOf<AsyncIterable<number>>();

		const iterableIterator = iterable[Symbol.asyncIterator]();

		v.expectTypeOf(iterableIterator).toMatchTypeOf<
			AsyncIterableIterator<number>
		>();

		const iterator = iterableIterator[Symbol.asyncIterator]();

		v.expectTypeOf(iterator).toMatchTypeOf<AsyncIterableIterator<number>>();
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

		const iterable = {
			[Symbol.iterator]: () => generator,
		};

		v.expectTypeOf(iterable).toMatchTypeOf<Iterable<number>>();

		const iterableIterator = iterable[Symbol.iterator]();

		v.expectTypeOf(iterableIterator).toMatchTypeOf<IterableIterator<number>>();

		const iterator = iterableIterator[Symbol.iterator]();

		v.expectTypeOf(iterator).toMatchTypeOf<IterableIterator<number>>();
	});
});
