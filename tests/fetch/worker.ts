export default {
  async fetch(req, env, ctx) {
    return fetch('http://localhost/resource')
  },
} satisfies ExportedHandler<Env>
