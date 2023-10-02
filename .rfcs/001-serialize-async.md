## Serializing promises and other async generators

### Finished JSON output

```js
const out = [
	// <first line of JSON>
	{
		json: {
			foo: "bar",
			iterator: ["AsyncIterator", 1, "__tson"],
			promise: ["Promise", 0, "__tson"],
		},
		nonce: "__tson",
	},
	// <first line of JSON>
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
async function stringifyEmitter*() {
    yield "[";
    yield "\n"
    yield JSON.stringify(jsonAndNonce)
    yield "\n"
    // comma before values
    yield ","
    yield "[" // values start
    yield "\n";

    // each value
    let isFirstValue = false;
    for await (const [refIndex, serializedValue] of valuesIterator) {
        if (!isFirstValue) {
            yield ","
            yield "\n";
        }

        yield JSON.stringify([refIndex, serializedValue])
    }


    yield "]" // end value array

    yield "]" // end response
}
```
