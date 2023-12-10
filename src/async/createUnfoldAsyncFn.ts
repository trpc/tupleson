import { TsonTypeHandlerKey } from "../sync/syncTypes.js";
import { TsonAsyncPath } from "./asyncTypesNew.js";

// type MapFold = <T1, T2 = T1, R = T2>(
// 	foldFn: (initial: R, element: T2) => R,
// 	mapFn?: (element: T1) => T2,
// ) => <R>(forest: Iterable<T1>) => R;

// type UnfoldMap<R, T1 = R, T2 = T1> = (
// 	unfoldFn: (source: R) => Iterable<T1>,
// 	mapFn?: (element: T1) => T2,
// ) => (source: R) => Iterable<T2>;

// type MapFoldTransform = <T1, T2 = T1, R = T2, Z = R>(
// 	foldFn: (initial: R, element: T2) => R,
// 	mapFn?: (element: T1) => T2,
// 	transformFn?: (from: R) => Z,
// ) => <R>(forest: Iterable<T1>) => R;

// type TransformUnfoldMap = <R, Z = R, T1 = Z, T2 = T1>(
// 	unfoldFn: (source: Z) => Iterable<T1>,
// 	mapFn?: (element: T1) => T2,
// 	transformFn?: (from: R) => Z,
// ) => (source: R) => Iterable<T2>;

interface TsonAsyncChunk {
	path: TsonAsyncPath;
}

export type TsonAsyncHead = TsonAsyncChunk &
	(
		| {
				handler: TsonTypeHandlerKey;
				type: "head";
		  }
		| {
				initial: "@@" | "[]" | "{}";
				type: "default";
		  }
	);

export type TsonAsyncLeaf = TsonAsyncChunk & {
	type: "leaf";
	value: unknown;
};

export interface TsonAsyncReference extends TsonAsyncChunk {
	target: TsonAsyncPath;
	type: "ref";
}

export interface TsonAsyncTail extends TsonAsyncChunk {
	statusCode?: number;
	type: "tail";
}

export type TsonAsyncHeadTuple =
	| ["default", path: TsonAsyncPath, initial: "@@" | "[]" | "{}"]
	| ["head", path: TsonAsyncPath, handler: TsonTypeHandlerKey];

export type TsonAsyncLeafTuple = [
	"leaf",
	path: TsonAsyncPath,
	value: unknown,
	handler?: TsonTypeHandlerKey | undefined,
];
export type TsonAsyncReferenceTuple = [
	"ref",
	path: TsonAsyncPath,
	target: TsonAsyncPath,
];
export type TsonAsyncTailTuple = [
	"tail",
	path: TsonAsyncPath,
	statusCode?: number | undefined,
];

export type TsonAsyncUnfoldedValue = AsyncGenerator<
	TsonAsyncHeadTuple | TsonAsyncLeafTuple,
	TsonAsyncTailTuple,
	// could insert something into the generator, but that's more complexity for plugin authors
	never
>;

// export interface TsonAsyncUnfoldFn<TSource = unknown>
// 	extends Omit<AsyncGeneratorFunction, "new"> {
// 	(source: TSource, path: TsonAsyncPath): MaybePromise<TsonAsyncUnfoldedValue>;
// }

export type TsonAsyncUnfolderFactory<T> = (
	source: T,
) =>
	| AsyncGenerator<{ chunk: unknown; key: number | string }, number | undefined>
	| AsyncIterable<{ chunk: unknown; key: number | string }>
	| AsyncIterator<{ chunk: unknown; key: number | string }, number | undefined>;

export function createTsonAsyncUnfoldFn<
	TFactory extends TsonAsyncUnfolderFactory<any>,
>(
	factory: TFactory,
): (
	source: TFactory extends TsonAsyncUnfolderFactory<infer TSource>
		? TSource
		: never,
) => AsyncGenerator<
	{ chunk: unknown; key: number | string },
	number | undefined,
	// could insert something into the generator, but that's more complexity for plugin authors
	never
> {
	return async function* unfold(source) {
		const unfolder = factory(source);
		const iterator =
			Symbol.asyncIterator in unfolder
				? unfolder[Symbol.asyncIterator]()
				: unfolder;

		let nextResult = await iterator.next();

		while (!nextResult.done) {
			yield nextResult.value;
			nextResult = await iterator.next();
		}

		return typeof nextResult.value === "number"
			? nextResult.value
			: nextResult.value instanceof Error
			? 500
			: 200;
	};
}
