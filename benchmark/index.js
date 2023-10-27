// taken from https://github.com/Rich-Harris/superjson-and-devalue

import ARSON from "arson";
import { parse, stringify, uneval } from "devalue";
import c from "kleur";
import * as superjson from "superjson";
import { createTson, tsonDate, tsonRegExp, tsonSet } from "tupleson";
import { gzipSync } from "zlib";

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
	nonce: () => "__",
	types: [tsonDate, tsonRegExp, tsonSet],
});

const testingMethods = [
	{
		name: 'superJSON',
		parse: str => superjson.parse(str),
		results: {
			parse: 0,
			size: 0,
			sizeGZipped: 0,
			stringify: 0,
		},
		stringify: () => superjson.stringify(obj),
	},
	{
		name: 'devalue.uneval',
		parse: str => eval(`(${str})`),
		results: {
			parse: 0,
			size: 0,
			sizeGZipped: 0,
			stringify: 0,
		},
		stringify: () => uneval(obj),
	},
	{
		name: 'devalue.stringify',
		parse: str => parse(str),
		results: {
			parse: 0,
			size: 0,
			sizeGZipped: 0,
			stringify: 0,
		},
		stringify: () => stringify(obj),
	},
	{
		name: 'arson',
		parse: str => ARSON.parse(str),
		results: {
			parse: 0,
			size: 0,
			sizeGZipped: 0,
			stringify: 0,
		},
		stringify: () => ARSON.stringify(obj),
	},
	{
		name: 'tson',
		parse: str => tson.parse(str),
		results: {
			parse: 0,
			size: 0,
			sizeGZipped: 0,
			stringify: 0,
		},
		stringify: () => tson.stringify(obj),
	},
];

// Test sizes
testingMethods.forEach(method => {
	const str = method.stringify(obj);

	method.results.size = str.length;
	method.results.sizeGZipped = gzipSync(str).length;

	console.log(
		`${method.name}: ${c.bold().cyan(method.results.size)} bytes / ${c
			.bold()
			.cyan(method.results.sizeGZipped)} bytes gzipped`,
	);
});


const iterations = 1e6;

function test(fn, label = fn.toString()) {
	const start = Date.now();
	console.log();
	console.log(c.bold(label));
	let i = iterations;
	while (i--) {
		fn();
	}

	const elapsed = Date.now() - start;
	console.log(
		`${iterations} iterations in ${c.bold().cyan(elapsed)}ms`,
	);

	return { elapsed, iterations };
}

// Test serialization

testingMethods.forEach(method => {
	const { elapsed } = test(method.stringify);
	method.results.stringify = elapsed;
});

// Test deserialization

testingMethods.forEach(method => {
	const str = method.stringify(obj);
	const { elapsed } = test(() => method.parse(str));
	method.results.parse = elapsed;
});

console.log();

console.table(testingMethods.map(method => {
	return {
		name: method.name,
		"parse (ms)": method.results.parse,
		"size (bytes)": method.results.size,
		"size gzipped (bytes)": method.results.sizeGZipped,
		"stringify (ms)": method.results.stringify,
	};
}));
