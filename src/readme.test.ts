/* eslint-disable @typescript-eslint/no-unused-vars */
import { test } from "vitest";

import {
	createTupleson,
	// Serialize BigInt
	tsonBigint,
	// Serialize Map
	tsonMap,
	// **throws** when encountering Infinity or NaN
	// tsonNumberGuard,
	// Serialize regular expression
	tsonRegExp,
	// Serialize sets
	tsonSet,
	// Serialize URLs
	// tsonURL,
	// Serialize undefined
	tsonUndefined,
} from "./index.js";

test("readme", () => {
	const json = createTupleson({
		// This nonce function is used to generate a nonce for the serialized value
		// This is used to identify the value as a serialized value
		nonce: () => "__tson",
		types: [
			// Pick which types you want to support
			tsonSet,
		],
	});

	const myObj = {
		foo: "bar",
		set: new Set([1, 2, 3]),
	} as const;

	const str = json.stringify(myObj, 2);
	// console.log(str);
	// ->
	// {
	//   "json": {
	//     "foo": "bar",
	//     "set": [
	//       "Set",
	//       [
	//         1,
	//         2,
	//         3
	//       ],
	//       "__tson"
	//     ]
	//   },
	//   "nonce": "__tson"
	// }

	const obj = json.parse(str);

	// console.log(obj);
	// -> { foo: 'bar', set: Set(3) { 1, 2, 3 } }

	type Obj = typeof obj;
	//   ^?
	// type Obj = {
	//     readonly foo: "bar";
	//     readonly set: Set<number>;
	// }
});
