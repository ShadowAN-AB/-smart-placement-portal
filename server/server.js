const http = require('http');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { buildApp } = require('./app');
const { setIO, roomForUser } = require('./utils/socketBus');

dotenv.config();

const PORT = process.env.PORT || 5050;
const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

connectDB();

const app = buildApp();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    // Vite dev server ports and any explicit CORS origin from env.
    origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) || true,
    credentials: true,
  },
});

// JWT handshake auth. Rejects unauthenticated connections.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized: token missing'));
    const payload = jwt.verify(token, jwtSecret);
    socket.userId = payload.userId;
    next();
  } catch {
    next(new Error('Unauthorized: invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(roomForUser(socket.userId));
});

setIO(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (with sockets)`);
});
