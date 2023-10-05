import { expect, test } from "vitest";

import {
	createTsonAsync,
	tsonAsyncIterator,
	tsonBigint,
	tsonPromise,
} from "../index.js";

test("deserialize async iterable", async () => {
	const tson = createTsonAsync({
		nonce: () => "__tson",
		types: [tsonAsyncIterator, tsonPromise, tsonBigint],
	});

	{
		// plain obj
		const obj = {
			foo: "bar",
		};

		const strIterable = tson.stringify(obj);

		const result = await tson.parse(strIterable);

		expect(result).toEqual(obj);
	}

	{
		// promise
		const obj = {
			foo: Promise.resolve("bar"),
		};

		const strIterable = tson.stringify(obj);

		const result = await tson.parse(strIterable);

		expect(await result.foo).toEqual("bar");
	}
});

// test("stringify async iterable + promise", async () => {
// 	const stringify = createAsyncTsonStringify({
// 		nonce: () => "__tson",
// 		types: [tsonAsyncIterator, tsonPromise, tsonBigint],
// 	});

// 	async function* iterable() {
// 		await new Promise((resolve) => setTimeout(resolve, 1));
// 		yield 1n;
// 		yield 2n;
// 	}

// 	const obj = {
// 		foo: "bar",
// 		iterable: iterable(),
// 		promise: Promise.resolve(42),
// 	};
// 	const buffer: string[] = [];
// 	for await (const value of stringify(obj, 2)) {
// 		buffer.push(value.trimEnd());
// 	}

// 	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
// 	const head: any = JSON.parse(buffer[1]!);

// 	expect(buffer).toMatchInlineSnapshot(`
// 		[
// 		  "[",
// 		  "  {\\"json\\":{\\"foo\\":\\"bar\\",\\"iterable\\":[\\"AsyncIterator\\",0,\\"__tson\\"],\\"promise\\":[\\"Promise\\",1,\\"__tson\\"]},\\"nonce\\":\\"__tson\\"}",
// 		  "  ,",
// 		  "  [",
// 		  "    [1,[0,42]]",
// 		  "    ,[0,[0,[\\"bigint\\",\\"1\\",\\"__tson\\"]]]",
// 		  "    ,[0,[0,[\\"bigint\\",\\"2\\",\\"__tson\\"]]]",
// 		  "    ,[0,[2]]",
// 		  "  ]",
// 		  "]",
// 		]
// 	`);

// 	expect(head).toMatchInlineSnapshot(`
// 		{
// 		  "json": {
// 		    "foo": "bar",
// 		    "iterable": [
// 		      "AsyncIterator",
// 		      0,
// 		      "__tson",
// 		    ],
// 		    "promise": [
// 		      "Promise",
// 		      1,
// 		      "__tson",
// 		    ],
// 		  },
// 		  "nonce": "__tson",
// 		}
// 	`);

// 	expect(head.json.iterable[0]).toBe("AsyncIterator");
// 	expect(head.json.promise[0]).toBe("Promise");
// });
