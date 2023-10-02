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
async function* deserializeAsync() {}

export async function* stringifyEmitter() {
	// first line of the json: init the array, ignored when parsing>
	yield "[\n";

	const valuesIterator = deserializeAsync();

	let isFirstStreamedValue = true;

	for await (const chunk of valuesIterator) {
		switch (chunk.type) {
			case "HEAD": {
				// (head is only called once)

				// second line: the shape of the json - used when parsing>
				yield JSON.stringify(chunk.head) + "\n";

				// third line: comma before values, ignored when parsing
				yield ",";
				yield "["; // values start
				yield "\n";
				continue;
			}

			case "VALUE": {
				if (!isFirstStreamedValue) {
					// add a comma between each value to ensure it's valid JSON
					// needs to be ignored
					yield ",";
				}

				isFirstStreamedValue = false;
				yield JSON.stringify(chunk.value) + "\n";

				yield "\n";
				continue;
			}
		}
	}

	yield "]"; // end value array
	yield "]"; // end response
}
```
