import {
	createTsonAsync,
	tsonAsyncIterator,
	tsonBigint,
	tsonPromise,
} from "tupleson";

export const tsonAsync = createTsonAsync({
	types: [tsonPromise, tsonAsyncIterator, tsonBigint],
});
