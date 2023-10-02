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

### Server-side-events

#### Emitting

```js
async function* stringifyAsync() {}

const response = null;
const data = {
	promise: Promise.resolve(42),
};

for await (const chunk of stringifyAsync(data)) {
	response.write(chunk);
}
```

##### Internals

**First chunk**:

```js
function walk() {}

function asyncSerializer(value) {
	const [
		/**
		 * TsonSerialized
		 **/
		head,
		/**
		 * yields [index, data]
		 */
		iterator,
	] = walk(value);

	return [head, iterator];
}

export function asyncStringify(value) {
	// head looks like

	// [
	// 		{}
	//  	,[

	const [head, iterator] = asyncSerializer(value);

	// first line of the json: init the array, ignored when parsing>
	let headAsString = "[" + "\n";
	// second line: the shape of the json - used when parsing>
	headAsString += JSON.stringify(head) + "\n";

	// third line: comma before values, ignored when parsing
	headAsString += ",[" + "\n";

	async function* serializedAsString() {
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

	return [headAsString, serializedAsString()];
}
```
