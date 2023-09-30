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

const result = tson.stringify(
	{
		foo: "bar",
		set: new Set([1, 2, 3]),
	},
	2,
);
console.log(result);
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

const obj = tson.parse(result);

// ✨ Retains type integrity
type Obj = typeof obj;
//   ^?
// type Obj = {
//     readonly foo: "bar";
//     readonly set: Set<number>;
// }
```

**Footnotes**:

[^1]: We don't support circular references as we don't think it's very desireable, but if you wanna contribute with adding opt-in support for that, you are very welcome!

## Contributors

<!-- spellchecker: disable -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://katt.dev/"><img src="https://avatars.githubusercontent.com/u/459267?v=4?s=100" width="100px;" alt="Alex / KATT"/><br /><sub><b>Alex / KATT</b></sub></a><br /><a href="https://github.com/KATT/tupleson/commits?author=KATT" title="Code">💻</a> <a href="#content-KATT" title="Content">🖋</a> <a href="https://github.com/KATT/tupleson/commits?author=KATT" title="Documentation">📖</a> <a href="#ideas-KATT" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-KATT" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-KATT" title="Maintenance">🚧</a> <a href="#projectManagement-KATT" title="Project Management">📆</a> <a href="#tool-KATT" title="Tools">🔧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.joshuakgoldberg.com/"><img src="https://avatars.githubusercontent.com/u/3335181?v=4?s=100" width="100px;" alt="Josh Goldberg ✨"/><br /><sub><b>Josh Goldberg ✨</b></sub></a><br /><a href="#tool-JoshuaKGoldberg" title="Tools">🔧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- spellchecker: enable -->

<!-- You can remove this notice if you don't want it 🙂 no worries! -->

> 💙 This package is based on [@JoshuaKGoldberg](https://github.com/JoshuaKGoldberg)'s [create-typescript-app](https://github.com/JoshuaKGoldberg/create-typescript-app).
