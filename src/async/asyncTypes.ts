import { serialized } from "../types.js";

export type TsonAsyncStringifierIterator<TValue> = AsyncIterable<string> & {
	[serialized]: TValue;
};

export type TsonAsyncStringifier = <TValue>(
	value: TValue,
	space?: number,
) => TsonAsyncStringifierIterator<TValue>;
