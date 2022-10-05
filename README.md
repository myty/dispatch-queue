# DispatchQueue

[![GitHub version](https://badgen.net/github/release/myty/dispatch-queue?color=green)](https://github.com/myty/dispatch-queue)
[![deno land](https://badgen.net/github/release/myty/dispatch-queue?color=green&label=deno.land)](https://deno.land/x/dispatch_queue)
[![npm version](https://badgen.net/npm/v/@myty/dispatch-queue?color=green)](https://www.npmjs.com/package/@myty/dispatch-queue)
[![Coverage Status](https://badgen.net/coveralls/c/github/myty/dispatch-queue?color=green)](https://coveralls.io/github/myty/dispatch-queue?branch=main)

A dispatch queue with the ability to configure multiple queue processors.

## Installation

### Node.js

```bash
# npm
npm install --save @myty/dispatch-queue
# yarn
yarn add @myty/dispatch-queue
# pnpm
pnpm install --save @myty/dispatch-queue
```

### Deno

```bash
import DispatchQueue from "https://deno.land/x/dispatch_queue/mod.ts";
```

## Example Usage

```typescript
const dispatcher = new DispatchQueue<string>({
  processor: (stringValue, workerId) => {
    conosle.log(`Worker, '${workerId}', is processing: '${stringValue}'`);
  },
});

dispatcher.process("test1");
// OUTPUT: "Worker, 'worker-1', is processing: 'test1'"
```
