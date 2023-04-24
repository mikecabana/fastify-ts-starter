import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import csrf from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.SECRET || 'secretsecretsecretsecretsecretsecretsecretsecretsecretsecret';

const app = fastify({ logger: true });

await app.register(helmet, {});
await app.register(cors, {
    origin: '*',
});
await app.register(cookie, { secret: SECRET });
await app.register(session, { secret: SECRET });
await app.register(csrf, { cookieOpts: { signed: true }, sessionPlugin: '@fastify/session' });

await app.register(swagger);
await app.register(swaggerUi, { routePrefix: '/docs' });

// generate a token
// app.get('/csrf', async (req, reply) => {
//     const token = reply.generateCsrf();
//     return { token };
// });

app.get(
    '/ping',
    {
        // onRequest: app.csrfProtection
    },
    (req, res) => {
        res.send('pong');
    }
);

// Run the server!
const start = async () => {
    try {
        await app.listen({ port: PORT });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
await start();

await app.ready();
app.swagger({ yaml: true });
