import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import csrf from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import { WebSocket } from 'ws';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.SECRET || 'secretsecretsecretsecretsecretsecretsecretsecretsecretsecret';

const clients = new Map<string, WebSocket>();

const isAuthenticated = (token: string | undefined) => {
	if (!token) {
		return false;
	}

	try {
		jwt.verify(token, SECRET, { algorithms: ['HS256'] });
		return true;
	} catch (err) {
		return false;
	}
};

const app = fastify({ logger: true });

await app.register(helmet, {});
await app.register(cors, {
	origin: '*',
});
await app.register(cookie, { secret: SECRET });
await app.register(session, { secret: SECRET });
await app.register(csrf, { cookieOpts: { signed: true }, sessionPlugin: '@fastify/session' });

await app.register(websocket);
await app.register(async function (fastify) {
	fastify.addHook('preValidation', async (req, rep) => {
		if (!isAuthenticated(req.headers.authorization)) {
			await rep.code(401).send('Unauthorized');
		}
	});
	fastify.get('/ws', { websocket: true }, (socket, req) => {
		// const socketId = req.headers['sec-websocket-key'] as string;

		// connect using the following endpoint: localhost:3000/ws?id=abc123
		const { id } = req.query as { id: string };

		console.log(`New client connection: ${id}`);
		console.log(JSON.stringify(req.query, null, 1));

		clients.set(id, socket);

		socket.on('message', (message) => socket.send(message.toString()));

		socket.on('close', () => {
			clients.delete(id);
			console.log(`Client disconnected: ${id}`);
		});
	});
});

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

// generate a basic access token by providing your own secret
// use the same environment secret in order to connect to socket server
app.post('/token', (req, res) => {
	const { secret } = req.body as { secret: string | undefined };
	if (!secret) {
		return res.code(404).send('Missing secret');
	}
	res.code(201).send(jwt.sign({}, secret, { algorithm: 'HS256', expiresIn: '1y' }));
});

// get count of clients connected to socket server
app.get('/ws/stats', (req, res) => {
	res.send({
		clients: clients.size,
	});
});

// run the server!
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
