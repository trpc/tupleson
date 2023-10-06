import {
	TsonAsyncOptions,
	tsonAsyncIterator,
	tsonBigint,
	tsonPromise,
} from "tupleson";

export const tsonOptions: TsonAsyncOptions = {
	types: [tsonPromise, tsonAsyncIterator, tsonBigint],
};
