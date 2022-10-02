# DispatchQueue

A deno and npm dispatch queue with the ability to configure multiple queue
processors.

## Installation

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
