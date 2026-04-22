import { defineNetwork, InterceptorSource } from 'msw/experimental'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'

export function setupNetwork() {
  const network = defineNetwork({
    sources: [
      new InterceptorSource({
        interceptors: [new FetchInterceptor()],
      }),
    ],
  })

  return network
}
