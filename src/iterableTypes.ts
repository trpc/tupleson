/**
 * @file
 * @see https://github.com/microsoft/TypeScript/issues/32682
 * @variation {Async} AsyncIterator, AsyncIterable, and AsyncIterableIterator can
 * be substituted for Iterator, Iterable, and IterableIterator respectively in
 * the below description.
 * @description
 * Native constructs which use Iterables discard the value of the return type
 * and call `next()` with no arguments. While it is possible to instantiate
 * an Iterable's Iterator manually, that iterator must be prepared to take
 * `undefined` as an argument to `next()`, and expect that the return value
 * may be discarded. Otherwise, it would break the Iterable contract.
 *
 * In other words, Iterators leave it to the consumer to decide what to do
 * on each iteration (via the 'next' and 'return' methods), while Iterables
 * enforce a contract that the consumer must follow, where these methods are
 * optional.
 *
 * To preserve correctness, an Iterable's `Next` and `Return` types
 * MUST be joined with undefined when passed as type parameters to the
 * Iterator returned by its [Symbol.iterator] method.
 *
 * For IterableIterators, a TypeScript construct which extends the Iterator
 * interface, the additional type parameters SHOULD NOT be joined with
 * undefined when passed to the Iterator which the interface extends. By testing
 * for the presence of a parameter in the `next()` method, an iterator can
 * determine whether is being called manually or by a native construct. It is
 * perfectly valid for an IterableIterator to require a parameter in it's own
 * `next()` method, but not in the `next()` method of the iterator returned
 * by its [Symbol.iterator].
 *
 * As of Feb 4, 2022 (v4.6.1), the TS team had shelved adding the 2nd and 3rd
 * type parameters to these interfaces, but had not ruled it out for the future.
 */

/**
 * A stronger type for Iterable
 */
export interface Iterable<
	T = unknown,
	TOptionalReturn = unknown,
	TOptionalNext = unknown,
> {
	[Symbol.iterator](): Iterator<
		T,
		TOptionalReturn | undefined,
		TOptionalNext | undefined
	>;
}

/**
 * A stronger type for IterableIterator.
 */
export interface IterableIterator<
	T = unknown,
	TOptionalReturn = unknown,
	TOptionalNext = unknown,
> extends Iterator<T, TOptionalReturn, TOptionalNext> {
	[Symbol.iterator](): IterableIterator<
		T,
		TOptionalReturn | undefined,
		TOptionalNext | undefined
	>;
}

/**
 * A stronger type for Generator
 */
export interface Generator<
	T = unknown,
	TOptionalReturn = unknown,
	TOptionalNext = unknown,
> {
	[Symbol.iterator](): Iterator<
		T,
		TOptionalReturn | undefined,
		TOptionalNext | undefined
	>;
}

/**
 * A stronger type for AsyncIterable
 */
export interface AsyncIterable<
	T = unknown,
	TOptionalReturn = unknown,
	TOptionalNext = unknown,
> {
	[Symbol.asyncIterator](): AsyncIterator<
		T,
		TOptionalReturn | undefined,
		TOptionalNext | undefined
	>;
}

/**
 * A stronger type for AsyncIterableIterator.
 */
export interface AsyncIterableIterator<
	T = unknown,
	TOptionalReturn = unknown,
	TOptionalNext = unknown,
> extends AsyncIterator<T, TOptionalReturn, TOptionalNext> {
	[Symbol.asyncIterator](): AsyncIterableIterator<
		T,
		TOptionalReturn | undefined,
		TOptionalNext | undefined
	>;
}
/**
 * A stronger type for AsyncGenerator
 */
export interface AsyncGenerator<
	T = unknown,
	TOptionalReturn = unknown,
	TOptionalNext = unknown,
> {
	[Symbol.asyncIterator](): AsyncIterator<
		T,
		TOptionalReturn | undefined,
		TOptionalNext | undefined
	>;
}
