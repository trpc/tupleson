// taken from https://github.com/Rich-Harris/superjson-and-devalue

import ARSON from "arson";
import { parse, stringify, uneval } from "devalue";
import c from "kleur";
import * as superjson from "superjson";
import { createTson, tsonDate, tsonRegExp, tsonSet } from "tupleson";

const obj = {
	array: [{ foo: 1 }, { bar: 2 }, { baz: 3 }],
	date: new Date(),
	number: 42,
	regex: /the quick brown fox/,
	set: new Set([1, 2, 3]),
	xss: '</script><script>alert("XSS")</script>',
};

// circular references are not supported by tupleson
// obj.self = obj;

const tson = createTson({
	types: [tsonDate, tsonRegExp, tsonSet],
});

const superjson_serialized = superjson.stringify(obj);
const devalue_unevaled = uneval(obj);
const devalue_stringified = stringify(obj);
const arson_stringified = ARSON.stringify(obj);
const tson_serialized = tson.stringify(obj);

console.log(
	`superjson output: ${c.bold().cyan(superjson_serialized.length)} bytes`,
);

console.log(`tson output: ${c.bold().cyan(tson_serialized.length)} bytes`);
// console.log(superjson_serialized);
console.log(
	`devalue.uneval output: ${c.bold().cyan(devalue_unevaled.length)} bytes`,
);
// console.log(devalue_unevaled);
console.log(
	`devalue.stringify output: ${c
		.bold()
		.cyan(devalue_stringified.length)} bytes`,
);
// console.log(devalue_stringified);
console.log(`arson output: ${c.bold().cyan(arson_stringified.length)} bytes`);
// console.log(arson_stringified);

// const superjson_deserialized = superjson.parse(superjson_serialized);
// const devalue_deserialized = eval(`(${devalue_unevaled})`);

const iterations = 1e6;

function test(fn, label = fn.toString()) {
	const start = Date.now();
	console.log();
	console.log(c.bold(label));
	let i = iterations;
	while (i--) {
		fn();
	}

	console.log(
		`${iterations} iterations in ${c.bold().cyan(Date.now() - start)}ms`,
	);
}

// serialization
// test(() => superjson.stringify(obj));
// test(() => tson.stringify(obj));
// test(() => uneval(obj));
// test(() => stringify(obj));
// test(() => ARSON.stringify(obj));

// // deserialization
// test(() => superjson.parse(superjson_serialized));
test(() => tson.parse(tson_serialized));
// test(() => eval(`(${devalue_unevaled})`));
// test(() => ARSON.parse(arson_stringified));
// test(() => parse(devalue_stringified));

console.log();
