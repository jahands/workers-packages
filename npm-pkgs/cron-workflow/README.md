# cron-workflow

An experimental package for building cron jobs with [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)

## Installation

```sh
npm install cron-workflow
```

## Define a cron workflow

Extend `CronWorkflow` and implement the `onTick()` handler (and optionally add `onInit`/`onFinalize` hooks):

```ts
// src/CleanupCron.cron.ts
import { CronContext, CronFinalizeContext, CronWorkflow } from 'cron-workflow'

export class CleanupCron extends CronWorkflow<Env> {
  schedule = '0 * * * *' // defaults to every 5 minutes

  // optional
  protected async onInit({ step }: CronContext) {
    await step.do('log start', async () => console.log('starting cleanup'))
  }

  // required
  protected async onTick({ step }: CronContext) {
    await step.do('delete stale records', async () => {
      // your cron work goes here
    })
  }

  // optional
  protected async onFinalize({ step, error }: CronFinalizeContext) {
    await step.do('log result', async () => {
      console.log(error ? 'cleanup failed' : 'cleanup finished')
    })
  }
}
```

Each hook receives the underlying `WorkflowStep`, so you can wrap work in `step.do()` steps, call `step.sleep()`, etc. Learn more [here](https://developers.cloudflare.com/workflows/get-started/guide/#2-create-your-workflows-steps).

## Configure your Worker

Add the workflow and required Durable Object binding to `wrangler.jsonc`:

```json
{
  "workflows": [
    // note: binding MUST match class_name
    { "name": "CleanupCron", "class_name": "CleanupCron", "binding": "CleanupCron" }
  ],
  "durable_objects": {
    "bindings": [{ "name": "CronController", "class_name": "CronController" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["CronController"] }]
}
```

Then re-export both your cron class and the provided `CronController` in your Worker entrypoint:

```ts
// src/index.ts
export { CronController } from 'cron-workflow'
export { CleanupCron } from './crons/CleanupCron.cron'
```

Although `CronController` is a stub today, shipping it now avoids a breaking change once controller features ship.

## Bootstrapping a run

Currently, it is necessary to trigger the Workflow the first time you deploy a new CronWorkflow for it to start running:

```sh
npx wrangler workflows trigger CleanupCron
```

From there the workflow will create a new instance for each run based on `schedule`.

## Current limitations

- Changing `schedule` only takes effect after the current workflow run finishes. You can terminate the instance and trigger a new one to apply it immediately. In the future, `CronController` will handle this automatically.
- `CronController` is currently a no-op, but will soon be required to ensure cron reliability and automatically handle schedule updates.
