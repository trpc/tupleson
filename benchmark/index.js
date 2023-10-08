// taken from https://github.com/Rich-Harris/superjson-and-devalue

import ARSON from "arson";
import * as devalue from "devalue";
import c from "kleur";
import * as superjson from "superjson";
import { createTson, tsonDate, tsonRegExp, tsonSet } from "tupleson";

const time_formatter = new Intl.NumberFormat('en-US', { unit: 'millisecond', style: 'unit' });
const size_formatter = new Intl.NumberFormat('en-US', { unit: 'byte', style: 'unit' });
const number_formatter = new Intl.NumberFormat('en-US');

const obj = {
	array: [{ foo: 1 }, { bar: 2 }, { baz: 3 }],
	date: new Date(),
	number: 42,
	regex: /the quick brown fox/,
	set: new Set([1, 2, 3]),
	xss: '</script><script>alert("XSS")</script>',
};

// circular references are not supported by tupleson
obj.self = obj;

const tson = createTson({
	types: [tsonDate, tsonRegExp, tsonSet],
});

const superjson_serialized = superjson.stringify(obj);
const devalue_unevaled = devalue.uneval(obj);
const devalue_stringified = devalue.stringify(obj);
const arson_stringified = ARSON.stringify(obj);
const tson_serialized = tson.stringify(obj);

console.log('-- SERIALIZED SIZE --\n')

console.log(
	`superjson output: ${c.bold().cyan(size_formatter.format(superjson_serialized.length))}`,
);

console.log(`tson output: ${c.bold().cyan(size_formatter.format(tson_serialized.length))}`);
// console.log(superjson_serialized);
console.log(
	`devalue.uneval output: ${c.bold().cyan(size_formatter.format(devalue_unevaled.length))}`,
);
// console.log(devalue_unevaled);
console.log(
	`devalue.stringify output: ${c
		.bold()
		.cyan(size_formatter.format(devalue_stringified.length))}`,
);
// console.log(devalue_stringified);
console.log(`arson output: ${c.bold().cyan(size_formatter.format(arson_stringified.length))}`);
// console.log(arson_stringified);

// const superjson_deserialized = superjson.parse(superjson_serialized);
// const devalue_deserialized = eval(`(${devalue_unevaled})`);

const iterations = 1e6;

function test(fn, label = fn.toString()) {
	console.log();
	console.log(c.bold(label));
	global.gc(); // force garbage collection before each test
	let i = iterations;
	const before_snap = process.memoryUsage();
	const start = Date.now();
	while (i--) {
		fn();
	}
	const delta = Date.now() - start;
	const after_snap = process.memoryUsage();
	console.log(
		`${number_formatter.format(iterations)} iterations in ${c.bold().cyan(time_formatter.format(delta))}`,
	);
	// log memory usage delta
	for (const key in after_snap) {
		const before = before_snap[key];
		const after = after_snap[key];
		const diff = after - before;
		const color = diff < 0 ? c.green : c.red;
		console.log(`  ${key}: ${color(size_formatter.format(diff))}`);
	}
}

console.log('\n-- SERIALIZATION DURATION --')

// serialization
test(() => superjson.stringify(obj));
test(() => tson.stringify(obj));
test(() => devalue.uneval(obj));
test(() => devalue.stringify(obj));
test(() => ARSON.stringify(obj));

console.log('\n-- DESERIALIZATION DURATION --')

// deserialization
test(() => superjson.parse(superjson_serialized));
test(() => tson.parse(tson_serialized));
test(() => eval(`(${devalue_unevaled})`));
test(() => ARSON.parse(arson_stringified));
test(() => devalue.parse(devalue_stringified));

console.log();
