import { TsonAbortError } from "./asyncErrors.js";
import {
	TsonAsyncBodyTuple,
	TsonAsyncTailTuple,
	TsonAsyncTuple,
} from "./asyncTypes2.js";
import { TsonAsyncUnfoldedValue } from "./createUnfoldAsyncFn.js";
import { MaybePromise } from "./iterableUtils.js";

export type TsonAsyncReducer<TInitial> = (
	ctx: TsonReducerCtx<TInitial>,
) => Promise<TsonAsyncReducerResult<TInitial>>;

export interface TsonAsyncReducerResult<TInitial> {
	abort?: boolean;
	accumulator: MaybePromise<TInitial>;
	error?: any;
	return?: TsonAsyncTailTuple | undefined;
}

export type TsonAsyncFoldFn = <TInitial>({
	initialAccumulator,
	reduce,
}: {
	initialAccumulator: TInitial;
	reduce: TsonAsyncReducer<TInitial>;
}) => (sequence: TsonAsyncUnfoldedValue) => Promise<TInitial>;

export type TsonReducerCtx<TAccumulator> =
	| TsonAsyncReducerReturnCtx<TAccumulator>
	| TsonAsyncReducerYieldCtx<TAccumulator>;

export type TsonAsyncFoldFnFactory = <TInitial>(opts: {
	initialAccumulator?: TInitial | undefined;
}) => TsonAsyncFoldFn;

export const createTsonAsyncFoldFn = <TInitial>({
	initializeAccumulator,
	reduce,
}: {
	initializeAccumulator: () => MaybePromise<TInitial>;
	reduce: TsonAsyncReducer<TInitial>;
}) => {
	//TODO: would it be better to use bigint for generator indexes? Can one imagine a request that long, with that many items?
	let i = 0;

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

interface TsonAsyncReducerYieldCtx<TAccumulator> {
	accumulator: TAccumulator;
	current: MaybePromise<
		IteratorYieldResult<Exclude<TsonAsyncTuple, TsonAsyncBodyTuple>>
	>;
	key?: null | number | string | undefined;
	source: TsonAsyncUnfoldedValue;
}

interface TsonAsyncReducerReturnCtx<TAccumulator> {
	accumulator: TAccumulator;
	current: MaybePromise<IteratorReturnResult<TsonAsyncTailTuple>>;
	key?: null | number | string | undefined;
	source?: TsonAsyncUnfoldedValue | undefined;
}
