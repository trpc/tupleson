import {
	TsonAsyncChunk,
	TsonAsyncHeadTuple,
	TsonAsyncLeafTuple,
	TsonAsyncTailTuple,
} from "./asyncTypes2.js";
import { MaybePromise } from "./iterableUtils.js";

export type TsonAsyncUnfoldedValue = AsyncGenerator<
	TsonAsyncHeadTuple | TsonAsyncLeafTuple,
	TsonAsyncTailTuple,
	// could insert something into the generator, but that's more complexity for plugin authors
	undefined
>;

export interface TsonAsyncUnfoldFn<TSource = unknown>
	extends Omit<AsyncGeneratorFunction, "new"> {
	(source: TSource): MaybePromise<TsonAsyncUnfoldedValue>;
}

export type TsonAsyncUnfolderFactory<T> = (
	source: T,
) =>
	| AsyncGenerator<TsonAsyncChunk, number | undefined>
	| AsyncIterable<TsonAsyncChunk>
	| AsyncIterator<TsonAsyncChunk, number | undefined>;

export function createTsonAsyncUnfoldFn<
	TFactory extends TsonAsyncUnfolderFactory<any>,
>(
	factory: TFactory,
): (
	source: TFactory extends TsonAsyncUnfolderFactory<infer TSource> ? TSource
	:	never,
) => AsyncGenerator<
	TsonAsyncChunk,
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	number | undefined | void,
	// could insert something into the generator, but that's more complexity for plugin authors
	undefined
> {
	return async function* unfold(source) {
		const unfolder = factory(source);
		const iterator =
			Symbol.asyncIterator in unfolder ?
				unfolder[Symbol.asyncIterator]()
			:	unfolder;

		let nextResult = await iterator.next();

		while (!nextResult.done) {
			yield nextResult.value;
			nextResult = await iterator.next();
		}

		return (
			typeof nextResult.value === "number" ? nextResult.value
			: nextResult.value instanceof Error ? 500
			: 200
		);
	};
}
