/**
 * @file
 * This file originally contained types for the `iterable` and `asyncIterable`
 * (as well as `iterableIterator` and `asyncIterableIterator`) types, but
 * ultimately they were decided against, as they were not ultimately useful.
 * The extensions essentially provided useless information, given that the
 * `next` and `return` methods cannot be relied upon to be present. For that,
 * Generators are a better choice, as they expose the `next` and `return`
 * methods through the GeneratorFunction syntax.
 * @see https://github.com/microsoft/TypeScript/issues/32682 for information
 * about the types that were removed.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

/**
 * A stronger type for Iterator
 */
export interface Iterator<T = unknown, TReturn = unknown, TNextArg = unknown>
	extends globalThis.Iterator<T, TReturn, TNextArg> {}

/**
 * A stronger type for AsyncIterator
 */
export interface AsyncIterator<
	T = unknown,
	TReturn = unknown,
	TNextArg = unknown,
> extends globalThis.AsyncIterator<T, TReturn, TNextArg> {}

/**
 * A stronger type for Generator
 */
export interface Generator<
	T = unknown,
	TOptionalReturn = unknown,
	TOptionalNext = unknown,
> extends globalThis.Generator<T, TOptionalReturn, TOptionalNext> {}
/**
 * A stronger type for AsyncGenerator
 */
export interface AsyncGenerator<
	T = unknown,
	TOptionalReturn = unknown,
	TOptionalNext = unknown,
> extends globalThis.AsyncGenerator<T, TOptionalReturn, TOptionalNext> {}

/* eslint-enable @typescript-eslint/no-empty-interface */
