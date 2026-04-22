import { defineNetwork, InterceptorSource } from 'msw/experimental'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'

export function setupNetwork() {
  const network = defineNetwork({
    sources: [
      new InterceptorSource({
        interceptors: [new FetchInterceptor(), new WebSocketInterceptor()],
      }),
    ],
  })

  return network
}
