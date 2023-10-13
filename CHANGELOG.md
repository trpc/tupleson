

## [0.17.4](https://github.com/trpc/tupleson/compare/0.17.3...0.17.4) (2023-10-13)


### Bug Fixes

* `tsonAsyncIterator` -> `tsonAsyncIterable` ([#66](https://github.com/trpc/tupleson/issues/66)) ([4a9c5c5](https://github.com/trpc/tupleson/commit/4a9c5c55ad3898271468fecb55dd0d542c37137a))

## [0.17.3](https://github.com/trpc/tupleson/compare/0.17.2...0.17.3) (2023-10-13)


### Bug Fixes

* fix commonjs entrypoints ([#64](https://github.com/trpc/tupleson/issues/64)) ([930d59a](https://github.com/trpc/tupleson/commit/930d59a3b1975bca93196186472ce2262baab511))

## [0.17.2](https://github.com/trpc/tupleson/compare/0.17.0...0.17.2) (2023-10-13)


### Bug Fixes

* release failed - bumping verison manually ([#63](https://github.com/trpc/tupleson/issues/63)) ([0aed395](https://github.com/trpc/tupleson/commit/0aed395628b1cf9c1aeaac87b426532de43894d5))
* remove `"type": "module"` ([#62](https://github.com/trpc/tupleson/issues/62)) ([5c84001](https://github.com/trpc/tupleson/commit/5c840015e1bc0541cdcf3d2531e1daef4ed418be))
* use error constructor params and spread them ([#61](https://github.com/trpc/tupleson/issues/61)) ([e52fe26](https://github.com/trpc/tupleson/commit/e52fe26709865473e1ea4a8bac542c51668770a0))

## [0.17.0](https://github.com/trpc/tupleson/compare/0.16.9...0.17.0) (2023-10-13)


### Bug Fixes

* infer error options to avoid type errors in environment that don't support it ([#59](https://github.com/trpc/tupleson/issues/59)) ([3f0ebb6](https://github.com/trpc/tupleson/commit/3f0ebb62cf8a93e65687b813141dbac5c407f212))


### Features

* add commonjs support ([#60](https://github.com/trpc/tupleson/issues/60)) ([d0e663c](https://github.com/trpc/tupleson/commit/d0e663c14d00b17e22a736db548f068c7016d7bb))

## [0.16.9](https://github.com/trpc/tupleson/compare/0.16.8...0.16.9) (2023-10-08)


### Bug Fixes

* move `onStreamError` to parse options + add test for request abortion ([#55](https://github.com/trpc/tupleson/issues/55)) ([9d5db3c](https://github.com/trpc/tupleson/commit/9d5db3ced181b722ccd2b254080ca0d22fa8c994))

## [0.16.8](https://github.com/trpc/tupleson/compare/0.16.7...0.16.8) (2023-10-08)


### Bug Fixes

* make `onStreamError` always be of type `TsonStreamInterruptedError` ([#41](https://github.com/trpc/tupleson/issues/41)) ([2614a46](https://github.com/trpc/tupleson/commit/2614a4626a6968439dbf67569d4ffac2dcd8cfdf))

## [0.16.7](https://github.com/trpc/tupleson/compare/0.16.6...0.16.7) (2023-10-07)


### Bug Fixes

* we should call `.close()` in async iterable ([#50](https://github.com/trpc/tupleson/issues/50)) ([b9a82f4](https://github.com/trpc/tupleson/commit/b9a82f41b9361360856f9141fd56b7ad49301c08))

## [0.16.6](https://github.com/trpc/tupleson/compare/0.16.5...0.16.6) (2023-10-07)


### Bug Fixes

* remove `try/catch` on controller enqueue ([#49](https://github.com/trpc/tupleson/issues/49)) ([c12034d](https://github.com/trpc/tupleson/commit/c12034dec0515195dd7ba4d64694cc0fd34d6156))

## [0.16.5](https://github.com/trpc/tupleson/compare/0.16.4...0.16.5) (2023-10-07)


### Bug Fixes

* fix type of `ReadableStreamDefaultController` ([#48](https://github.com/trpc/tupleson/issues/48)) ([33d0adb](https://github.com/trpc/tupleson/commit/33d0adb14a327fde2ed921f99f2ef6e967841442))

## [0.16.4](https://github.com/trpc/tupleson/compare/0.16.3...0.16.4) (2023-10-07)


### Bug Fixes

* handle unexpected end of stream  ([#46](https://github.com/trpc/tupleson/issues/46)) ([1efce87](https://github.com/trpc/tupleson/commit/1efce872ed0b1714b165ddef7db18a3a05ad6b60))

## [0.16.3](https://github.com/trpc/tupleson/compare/0.16.2...0.16.3) (2023-10-06)


### Bug Fixes

* update readme more ([#44](https://github.com/trpc/tupleson/issues/44)) ([fbbec98](https://github.com/trpc/tupleson/commit/fbbec9850986730708e14667cb788390673e2c5d))

## [0.16.2](https://github.com/trpc/tupleson/compare/0.16.1...0.16.2) (2023-10-06)


### Bug Fixes

* update readme ([#43](https://github.com/trpc/tupleson/issues/43)) ([c47b80a](https://github.com/trpc/tupleson/commit/c47b80ad42ab8a9e175ef3c7d19b7039f1f5060e))

## [0.16.1](https://github.com/trpc/tupleson/compare/0.16.0...0.16.1) (2023-10-06)


### Bug Fixes

* remove `postinstall` as it breaks npm usage ([#42](https://github.com/trpc/tupleson/issues/42)) ([c924637](https://github.com/trpc/tupleson/commit/c924637e3c69398ff97384768c45d57eec3c7aa9))

# [0.16.0](https://github.com/trpc/tupleson/compare/0.15.0...0.16.0) (2023-10-06)


### Features

* align naming on functions ([#37](https://github.com/trpc/tupleson/issues/37)) ([84faf3b](https://github.com/trpc/tupleson/commit/84faf3bc890cbfc1208fe3ea4212c5629fc88426))

# [0.15.0](https://github.com/trpc/tupleson/compare/0.14.0...0.15.0) (2023-10-06)


### Features

* add example project ([#34](https://github.com/trpc/tupleson/issues/34)) ([9715052](https://github.com/trpc/tupleson/commit/9715052a8f2ca62dca328c239e80b9fa5148e8d4))

# [0.14.0](https://github.com/trpc/tupleson/compare/0.13.1...0.14.0) (2023-10-06)


### Features

* `deserializeAsync` uses streams to pipe values ([#32](https://github.com/trpc/tupleson/issues/32)) ([0363707](https://github.com/trpc/tupleson/commit/03637070756d29d5cb5df512a10c845d7c8b2089))

# [0.13.1](https://github.com/trpc/tupleson/compare/0.13.0...0.13.1) (2023-10-06)


### Bug Fixes

* `deserializeAsync` string chunks can split anywhere ([#30](https://github.com/trpc/tupleson/issues/30)) ([aa19cc4](https://github.com/trpc/tupleson/commit/aa19cc42bf03b5d015623abaaa00a592bff5713d))

# [0.13.0](https://github.com/trpc/tupleson/compare/0.12.0...0.13.0) (2023-10-05)


### Bug Fixes

* rename `AsyncIterator` -> `AsyncIterable` ([#29](https://github.com/trpc/tupleson/issues/29)) ([d8b1c01](https://github.com/trpc/tupleson/commit/d8b1c01e8634148721874b4e7dbe0695577af0f2))


### Features

* include `src` files on npm ([#28](https://github.com/trpc/tupleson/issues/28)) ([331802d](https://github.com/trpc/tupleson/commit/331802d1487f873a0e8cde3e224cdc47c29fc9f7))

# [0.12.0](https://github.com/trpc/tupleson/compare/0.11.1...0.12.0) (2023-10-05)


### Features

* serializing async iterable ([#26](https://github.com/trpc/tupleson/issues/26)) ([69ff286](https://github.com/trpc/tupleson/commit/69ff2865aafe2bcb856ca6e93415024b3b078d58))

# [0.11.1](https://github.com/trpc/tupleson/compare/0.11.0...0.11.1) (2023-10-04)


### Bug Fixes

* make promise deserialization less flaky ([#21](https://github.com/trpc/tupleson/issues/21)) ([4cadad0](https://github.com/trpc/tupleson/commit/4cadad09ba651daac95391f7c59c084038407365))

# [0.11.0](https://github.com/trpc/tupleson/compare/0.10.0...0.11.0) (2023-10-03)

### Features

* serialization of promises ([#20](https://github.com/trpc/tupleson/issues/20)) ([dc286be](https://github.com/trpc/tupleson/commit/dc286bef71e537a658bbd7cb5dad7596eaf59b47))

# [0.10.0](https://github.com/trpc/tupleson/compare/0.9.0...0.10.0) (2023-10-02)

### Features

* use UUIDs for nonce ([#19](https://github.com/trpc/tupleson/issues/19)) ([e347640](https://github.com/trpc/tupleson/commit/e347640dd10bf6ecc6b93f99e3118f572da671b3))

# [0.9.0](https://github.com/trpc/tupleson/compare/0.8.0...0.9.0) (2023-10-01)

### Features

* simplify symbols ([#16](https://github.com/trpc/tupleson/issues/16)) ([32720a4](https://github.com/trpc/tupleson/commit/32720a445acfcf31d51caa38dc9d7c7a165771d3))

# [0.8.0](https://github.com/trpc/tupleson/compare/0.7.0...0.8.0) (2023-10-01)

### Features

* prevent maximum call stack in favor of a custom error ([#15](https://github.com/trpc/tupleson/issues/15)) ([18cdf03](https://github.com/trpc/tupleson/commit/18cdf03aee46dbb0a58cb781d1a464f1dba992f1))

# [0.7.0](https://github.com/trpc/tupleson/compare/0.6.1...0.7.0) (2023-09-30)

### Features

* add built-in support for `Symbol`s ([#13](https://github.com/trpc/tupleson/issues/13)) ([dab884a](https://github.com/trpc/tupleson/commit/dab884a6a08b9e6b356c53a4cd2ac21a74421296))

# [0.6.1](https://github.com/trpc/tupleson/compare/0.6.0...0.6.1) (2023-09-30)

### Bug Fixes

* update readme ([#12](https://github.com/trpc/tupleson/issues/12)) ([d47b05d](https://github.com/trpc/tupleson/commit/d47b05de2348d05b62db236bae66cdf6b25896f9))

# [0.6.0](https://github.com/trpc/tupleson/compare/0.5.0...0.6.0) (2023-09-30)

### Features

* add custom serializer example ([#8](https://github.com/trpc/tupleson/issues/8)) ([58eab05](https://github.com/trpc/tupleson/commit/58eab05baff0dd07803b5aa01c402fcd02df5b09))

# [0.5.0](https://github.com/trpc/tupleson/compare/0.4.0...0.5.0) (2023-09-30)

### Features

* `createTypeson` -> `createTson` ([#6](https://github.com/trpc/tupleson/issues/6)) ([3613716](https://github.com/trpc/tupleson/commit/3613716eedb541c2592d14f76130a7295d340d5c))

# [0.4.0](https://github.com/trpc/tupleson/compare/0.3.1...0.4.0) (2023-09-30)

### Features

* allow `number` in `nonce` callback ([#5](https://github.com/trpc/tupleson/issues/5)) ([d2fcb7f](https://github.com/trpc/tupleson/commit/d2fcb7f5175705bf1ec01fc67b8ed2feacdcac7d))

# [0.3.1](https://github.com/trpc/tupleson/compare/0.3.0...0.3.1) (2023-09-30)

### Bug Fixes

* `serializer` -> `serialize` ([#4](https://github.com/trpc/tupleson/issues/4)) ([93a45a5](https://github.com/trpc/tupleson/commit/93a45a5e32ad1ebddba6283627551830c1e621ec))

# [0.3.0](https://github.com/trpc/tupleson/compare/0.2.0...0.3.0) (2023-09-30)

### Features

* add readme ([#3](https://github.com/trpc/tupleson/issues/3)) ([b4e5ed6](https://github.com/trpc/tupleson/commit/b4e5ed679df7b56f901da0b937d2ba44d60ae356))

# 0.2.0 (2023-09-30)

### Features

* add `createTupleson` fn and more ([#2](https://github.com/trpc/tupleson/issues/2)) ([72910ae](https://github.com/trpc/tupleson/commit/72910ae35c55581b860207e8e45ac098f5bef6ad))

# 0.1.0 (2023-09-30)

### Features

* initial version ([#1](https://github.com/trpc/tupleson/issues/1)) ([ccce25b](https://github.com/trpc/tupleson/commit/*cce25b6a039cf2e5c1a774c1ab022f0946ca8d5))
- initialized repo ✨ ([c9e92a4](https://github.com/trpc/tupleson/commit/c9e92a42c97a8bc1ee3a9214f65626425c8598e3))