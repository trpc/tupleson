import { TsonAbortError } from "./asyncErrors.js";
import { TsonAsyncChildLabel } from "./asyncTypesNew.js";
import { TsonReducerResult } from "./createFoldFn.js";
import {
	TsonAsyncHeadTuple,
	TsonAsyncLeafTuple,
	TsonAsyncTailTuple,
	TsonAsyncUnfoldedValue,
} from "./createUnfoldAsyncFn.js";
import { MaybePromise } from "./iterableUtils.js";

export type TsonAsyncReducer<TReturn, TInitial> = (
	ctx: TsonReducerCtx<TsonAsyncTailTuple, TInitial>,
) => Promise<TsonAsyncReducerResult<TReturn, TInitial>>;

export type TsonAsyncReducerResult<TReturn, TInitial> = Omit<
	TsonReducerResult<TReturn, TInitial>,
	"accumulator"
> & {
	accumulator: MaybePromise<TInitial>;
};

export type TsonAsyncFoldFn = <TInitial, TReturn>({
	initialAccumulator,
	reduce,
}: {
	initialAccumulator: TInitial;
	reduce: TsonAsyncReducer<TReturn, TInitial>;
}) => (sequence: TsonAsyncUnfoldedValue) => Promise<TInitial>;

export type TsonReducerCtx<TReturn, TAccumulator> =
	| TsonAsyncReducerReturnCtx<TAccumulator, TReturn>
	| TsonAsyncReducerYieldCtx<TAccumulator, TReturn>;

// export type TsonAsyncFoldFnFactory = <
// 	T,
// 	TInitial = T,
// 	TReturn = undefined,
// >(opts: {
// 	initialAccumulator?: TInitial | undefined;
// 	reduce: TsonAsyncReducer<T, TReturn, TInitial>;
// }) => TsonAsyncFoldFn<TInitial>;

export const createTsonAsyncFoldFn = <TInitial, TReturn>({
	initializeAccumulator,
	reduce,
}: {
	initializeAccumulator: () => MaybePromise<TInitial>;
	reduce: TsonAsyncReducer<TReturn, TInitial>;
}) => {
	let i = 0n;

	return async function fold(sequence: TsonAsyncUnfoldedValue) {
		let result: {
			abort?: boolean;
			accumulator: MaybePromise<TInitial>;
			error?: any;
			return?: TsonAsyncTailTuple | undefined;
		} = {
			accumulator: initializeAccumulator(),
		};

		let current = await sequence.next();

		if (current.done) {
			const output = await reduce({
				accumulator: await result.accumulator,
				current,
				key: i++,
				source: sequence,
			});

			return output.accumulator;
		}

		while (!current.done) {
			result = await reduce({
				accumulator: await result.accumulator,
				current,
				key: i++,
				source: sequence,
			});

			if (result.abort) {
				if (result.return) {
					current = await sequence.return(result.return);
				}

				current = await sequence.throw(result.error);

				if (!current.done) {
					throw new TsonAbortError(
						"Unexpected result from `throw` in reducer: expected done",
					);
				}
			} else {
				current = await sequence.next();
			}
		}

		const output = await reduce({
			accumulator: await result.accumulator,
			current,
			key: i++,
			source: sequence,
		});

		return output.accumulator;
	};
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface TsonAsyncReducerYieldCtx<TAccumulator, _TReturn> {
	accumulator: TAccumulator;
	current: MaybePromise<
		IteratorYieldResult<TsonAsyncHeadTuple | TsonAsyncLeafTuple>
	>;
	key: TsonAsyncChildLabel;
	source: TsonAsyncUnfoldedValue;
}

interface TsonAsyncReducerReturnCtx<TAccumulator, TReturn> {
	accumulator: TAccumulator;
	current: MaybePromise<IteratorReturnResult<TReturn>>;
	key?: TsonAsyncChildLabel | undefined;
	source?: TsonAsyncUnfoldedValue | undefined;
}
