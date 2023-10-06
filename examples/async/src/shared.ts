import {
	TsonAsyncOptions,
	tsonAsyncIterator,
	tsonBigint,
	tsonPromise,
} from "tupleson";

/**
 * Shared tupleSON options for the server and client.
 */
export const tsonOptions: TsonAsyncOptions = {
	// We need to specify the types we want to allow serialization of
	types: [
		// Allow serialization of promises
		tsonPromise,
		// Allow serialization of async iterators
		tsonAsyncIterator,
		// Allow serialization of bigints
		tsonBigint,
	],
};
