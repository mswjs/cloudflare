import { bypass, ws } from 'msw'
import { defineNetwork, InterceptorSource } from 'msw/experimental'
import { createRequestId, resolveWebSocketUrl } from '@mswjs/interceptors'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import {
  WebSocketInterceptor,
  type WebSocketData,
  type WebSocketServerEventMap,
  type WebSocketClientEventMap,
  type WebSocketClientConnectionProtocol,
  type WebSocketServerConnectionProtocol,
} from '@mswjs/interceptors/WebSocket'
import { InMemoryHandlersController } from '../../msw/lib/core/experimental/handlers-controller.mjs'

export function setupNetwork() {
  const handlersController = new InMemoryHandlersController([])

  ws.onUpgrade = async ({ requestId, request }) => {
    const handlers = handlersController.getHandlersByKind('websocket')

    if (handlers.length === 0) {
      return
    }

    const url = new URL(request.url)
    const connectionUrl = resolveWebSocketUrl(url)
    const [client, server] = Object.values(new WebSocketPair())

    const connection = {
      client: new CloudflareWebSocketClientConnection({
        url: connectionUrl,
        socket: server,
      }),
      server: new CloudflareWebSocketServerConnection({
        url: request.url,
      }),
      info: {
        protocols: [],
      },
    }

    for (const handler of handlers) {
      await handler.run({
        requestId,
        request,
        ...connection,
      })
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  const network = defineNetwork({
    sources: [
      new InterceptorSource({
        interceptors: [new FetchInterceptor(), new WebSocketInterceptor()],
      }),
    ],
    handlers: handlersController,
  })

  return network
}

class CloudflareWebSocketClientConnection implements WebSocketClientConnectionProtocol {
  #socket: WebSocket

  public id: string
  public url: URL

  constructor(options: { url: string; socket: WebSocket }) {
    this.#socket = options.socket

    this.id = createRequestId()
    this.url = new URL(options.url)
  }

  send(data: WebSocketData): void {
    this.#socket.accept()
    this.#socket.send(data as any)
  }

  close(code?: number, reason?: string): void {
    this.#socket.close(code, reason)
  }

  addEventListener<EventType extends keyof WebSocketClientEventMap>(
    type: EventType,
    listener: (
      this: WebSocket,
      event: WebSocketClientEventMap[EventType],
    ) => void,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.#socket.addEventListener(type, listener, options)
  }

  removeEventListener<EventType extends keyof WebSocketClientEventMap>(
    event: EventType,
    listener: (
      this: WebSocket,
      event: WebSocketClientEventMap[EventType],
    ) => void,
    options?: EventListenerOptions | boolean,
  ): void {
    this.#socket.removeEventListener(event, listener, options)
  }
}

class CloudflareWebSocketServerConnection implements WebSocketServerConnectionProtocol {
  #url: string
  #pendingSocket: PromiseWithResolvers<WebSocket>

  constructor(options: { url: string }) {
    this.#url = options.url
    this.#pendingSocket = Promise.withResolvers<WebSocket>()
  }

  connect(): void {
    const upgradeRequest = new Request(this.#url, {
      headers: {
        upgrade: 'websocket',
      },
    })

    fetch(bypass(upgradeRequest))
      .then((response) => {
        if (!response.webSocket) {
          throw new Error(
            `Failed to establish an actual WebSocket connection at "${this.#url}": the server did not approve the handshake`,
          )
        }

        response.webSocket.accept()
        this.#pendingSocket.resolve(response.webSocket)
      })
      .catch((error) => {
        this.#pendingSocket.reject(error)
      })
  }

  send(data: WebSocketData): void {
    this.#pendingSocket.promise.then((socket) => socket.send(data as any))
  }

  close(): void {
    this.#pendingSocket.promise.then((socket) => socket.close())
  }

  addEventListener<EventType extends keyof WebSocketServerEventMap>(
    event: EventType,
    listener: (
      this: WebSocket,
      event: WebSocketServerEventMap[EventType],
    ) => void,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.#pendingSocket.promise.then((socket) => {
      socket.addEventListener(event, listener, options)
    })
  }

  removeEventListener<EventType extends keyof WebSocketServerEventMap>(
    event: EventType,
    listener: (
      this: WebSocket,
      event: WebSocketServerEventMap[EventType],
    ) => void,
    options?: EventListenerOptions | boolean,
  ): void {
    this.#pendingSocket.promise.then((socket) => {
      socket.removeEventListener(event, listener, options)
    })
  }
}
