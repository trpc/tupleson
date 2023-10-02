<h1 align="center">tupleSON</h1>

<p align="center">A hackable JSON serializer/deserializer</p>

<p align="center">
	<a href="#contributors" target="_blank">
<!-- prettier-ignore-start -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
<img alt="All Contributors: 2" src="https://img.shields.io/badge/all_contributors-2-21bb42.svg" />
<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- prettier-ignore-end -->
</a>
	<a href="https://codecov.io/gh/KATT/tupleson" target="_blank">
		<img alt="Codecov Test Coverage" src="https://codecov.io/gh/KATT/tupleson/branch/main/graph/badge.svg"/>
	</a>
	<a href="https://github.com/KATT/tupleson/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank">
		<img alt="Contributor Covenant" src="https://img.shields.io/badge/code_of_conduct-enforced-21bb42" />
	</a>
	<a href="https://github.com/KATT/tupleson/blob/main/LICENSE.md" target="_blank">
		<img alt="License: MIT" src="https://img.shields.io/github/license/KATT/tupleson?color=21bb42">
	</a>
	<img alt="Style: Prettier" src="https://img.shields.io/badge/style-prettier-21bb42.svg" />
	<img alt="TypeScript: Strict" src="https://img.shields.io/badge/typescript-strict-21bb42.svg" />
</p>

## Introduction

A hackable JSON serializer/deserializer that allows you to serialize/deserialize almost[^1] anything.

Serialize exactly what you want; no more, no less.

[^1]: We don't support circular references as we don't think it's very desireable, but if you wanna contribute with adding opt-in support for that, you are very welcome!

### Example

```ts

/* eslint-disable eslint-comments/disable-enable-pair, @typescript-eslint/no-unused-vars, n/no-missing-import */

import {
	// Create serializer / deserializer
	createTson,
	// Serialize `bigint`
	tsonBigint,
	// Serialize `Map`s
	tsonMap,
	// **throws** when encountering Infinity or NaN
	tsonNumberGuard,
	// Serialize regular expression
	tsonRegExp,
	// Serialize `Set`s
	tsonSet,
	// serialize a Symbol
	tsonSymbol,
	// Serialize `URL`s
	tsonURL,
	// Serialize `undefined`
	tsonUndefined,
	// **throws** when encountering non-registered complex objects (like class instances)
	tsonUnknownObjectGuard,
} from "tupleson";

const tson = createTson({
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
};

const str = tson.stringify(myObj, 2)
console.log(str);
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

const obj = tson.parse(str);

// ✨ Retains type integrity
type Obj = typeof obj;
//   ^?
// -> type Obj = { foo: string; set: Set<number>; }
```

### Extend with a custom serializer

#### [Temporal](https://www.npmjs.com/package/@js-temporal/polyfill)

> See test reference in [`./src/extend/temporal.test.ts`](./src/extend/temporal.test.ts)

```ts
/* eslint-disable eslint-comments/disable-enable-pair, @typescript-eslint/no-unused-vars, n/no-missing-import, n/no-unpublished-import */
import { Temporal } from "@js-temporal/polyfill";
import { TsonType, createTson } from "tupleson";

const plainDate: TsonType<Temporal.PlainDate, string> = {
	deserialize: (v) => Temporal.PlainDate.from(v),
	key: "PlainDate",
	serialize: (v) => v.toJSON(),
	test: (v) => v instanceof Temporal.PlainDate,
};

const instant: TsonType<Temporal.Instant, string> = {
	deserialize: (v) => Temporal.Instant.from(v),
	key: "Instant",
	serialize: (v) => v.toJSON(),
	test: (v) => v instanceof Temporal.Instant,
};

const tson = createTson({
	types: [plainDate, instant],
});
```

#### [Decimal.js](https://github.com/MikeMcl/decimal.js)

> See test reference in [`./src/extend/decimal.test.ts`](./src/extend/decimal.test.ts)

```ts
/* eslint-disable eslint-comments/disable-enable-pair, @typescript-eslint/no-unused-vars, n/no-missing-import, n/no-unpublished-import */
import { Decimal } from "decimal.js";

const decimalJs: TsonType<Decimal, string> = {
	deserialize: (v) => new Decimal(v),
	key: "Decimal",
	serialize: (v) => v.toJSON(),
	test: (v) => v instanceof Decimal,
};

const tson = createTson({
	types: [decimalJs],
});
```

<!-- ## All contributors ✨

<a href="https://github.com/KATT/tupleson/graphs/contributors">
  <p align="center">
    <img width="720" src="https://contrib.rocks/image?repo=KATT/tupleson" alt="A table of avatars from the project's contributors" />
  </p>
</a> -->

<!-- spellchecker: enable -->

<!-- You can remove this notice if you don't want it 🙂 no worries! -->

> 💙 This package is based on [@JoshuaKGoldberg](https://github.com/JoshuaKGoldberg)'s [create-typescript-app](https://github.com/JoshuaKGoldberg/create-typescript-app).
