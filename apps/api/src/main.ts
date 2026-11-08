// apps/api/src/main.ts — Production Fastify API Server Bootstrap
import 'dotenv/config';
import { createFastifyApp } from './fastify/server';

async function bootstrap() {
  const port = parseInt(process.env.PORT || '4000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    const app = await createFastifyApp();

    const address = await app.listen({ port, host });
    console.log('========================================================================');
    console.log(`🚀 EXAMLY HIGH-PERFORMANCE FASTIFY API ENGINE`);
    console.log(`📡 Server listening at: ${address}`);
    console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🛡️  Zero-Trust RBAC & Timing Telemetry: ACTIVE`);
    console.log('========================================================================');

    // Graceful Shutdown Handlers
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\n🛑 Received ${signal}, draining connections and shutting down gracefully...`);
        try {
          await app.close();
          console.log('👋 Fastify API server closed successfully.');
          process.exit(0);
        } catch (err) {
          console.error('Error during graceful shutdown:', err);
          process.exit(1);
        }
      });
    }
  } catch (err) {
    console.error('💥 Fatal error during Fastify API bootstrap:', err);
    process.exit(1);
  }
}

bootstrap();
