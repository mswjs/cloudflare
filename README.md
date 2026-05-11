# `@msw/cloudflare`

Develop and test Cloudflare applications with Mock Service Worker.

## Getting started

### Install

```sh
npm i pkg.pr.new/mswjs/cloudflare/@msw/cloudflare@beta msw
```

> This package requires `msw` as a peer dependency.

### Usage

Let's say your worker performs a GET request to `https://example.com/user`.

```ts
// worker.ts
export default {
  async fetch(req, env, ctx) {
    const response = await fetch('https://api.example.com/user')
    const user = await response.json()

    return new Response(user.id, {
      headers: { 'content-type': 'text/plain' },
    })
  },
}
```

Here's how you can intercept and mock that third-party request in order to reliably test your worker in Vitest.

```ts
import { env } from 'cloudflare:workers'
import { createExecutionContext } from 'cloudflare:test'
import { http, HttpResponse } from 'msw'
import { setupNetwork } from '@msw/cloudflare'
import worker from './worker'

const network = setupNetwork()

beforeAll(() => {
  network.enable()
})

afterEach(() => {
  network.resetHandlers()
})

afterAll(() => {
  network.disable()
})

it('responds with the user id', async () => {
  network.use(
    http.get('https://api.example.com/user', () => {
      return HttpResponse.json({ id: 1, name: 'John Maverick' })
    }),
  )

  const ctx = createExecutionContext()
  const response = await worker.fetch(
    new Request('http://localhost/'),
    env,
    ctx,
  )

  expect.soft(response.status).toBe(200)
  await expect.soft(response.text()).resolves.toBe('1')
})
```

## Related materials

- [**Write your first test in Cloudflare Docs**](https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/)
- [Mocking HTTP with MSW](https://mswjs.io/docs/http/)
- [Mocking GraphQL with MSW](https://mswjs.io/docs/graphql/)
- [Mocking WebSocket with MSW](https://mswjs.io/docs/websocket/)
