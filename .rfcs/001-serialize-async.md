## Serializing promises and other async generators

### Finished JSON output

```js
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const out = [
	// <first line> is just a `[` that initializes the array pf the response
	// <second line>
	{
		json: {
			foo: "bar",
			iterator: ["AsyncIterator", 1, "__tson"],
			promise: ["Promise", 0, "__tson"],
		},
		nonce: "__tson",
	},
	// <second line>
	// <second line of json>
	[
		// ------ this could be streamed ------
		[1, ["chunk", "chunk from iterator"]],
		[0, ["resolve", "result of promise"]],
		[1, ["chunk", "another chunk from iterator"]],
		[1, ["end"]],
	],
];
```

### Serializing

#### Emitting SSE

```js
async function* asyncStringify() {
	// see further down for idea of implementation
}

const response = null;
const data = {
	promise: Promise.resolve(42),
};

const iterator = asyncStringify(data);

for await (const chunk of iterator) {
	response.write(chunk);
}
```

##### Internals

```js
function walker(nonce, value) {
	let idx = 0;
	// key: index
	// value: [index, Promise]
	const promises = new Map();
	// ... once we start looking at async iterators we can look at https://github.com/fraxken/combine-async-iterators/blob/master/index.js
	const iterator = {
		async *[Symbol.asyncIterator]() {
			while (promises.size) {
				const [index, status, value] = await Promise.race(promises.values());

				yield [index, status, walk(value)];
				promises.delete(index);
			}
		},
	};

	function registerPromise(promise) {
		const index = idx++;
		promises.set(
			index,
			promise
				.then((result) => [index, "resolved", result])
				.catch((err) => [index, "rejected", err]),
		);
	}

	function walk(value) {
		// adds promises if it encounters a promise
		registerPromise(promise);
	}

	return [walk(value), iterator];
}

function asyncSerializer(value) {
	const nonce = "...";
	const [
		/**
		 * TsonSerialized
		 **/
		head,
		/**
		 * yields [index, data]
		 */
		iterator,
	] = walker(nonce, value);

	return [head, iterator];
}

export async function* asyncStringify(value) {
	// head looks like

	// [
	// 		{ json: {}, nonce: "..." }
	//  	,[

	const [head, iterator] = asyncSerializer(value);

	// first line of the json: init the array, ignored when parsing>
	let headAsString = "[" + "\n";
	// second line: the shape of the json - used when parsing>
	headAsString += JSON.stringify(head) + "\n";

	// third line: comma before values, ignored when parsing
	headAsString += ",[" + "\n";

	yield headAsString;

	let isFirstStreamedValue = true;
	for await (const [index, serializedValue] of iterator) {
		if (!isFirstStreamedValue) {
			// add a comma between each value to ensure it's valid JSON
			// needs to be ignored when parsing
			yield ",";
		}

		isFirstStreamedValue = false;
		yield JSON.stringify([index, serializedValue]) + "\n";

		continue;
	}

	yield "]"; // end value array
	yield "]"; // end response
}
```
