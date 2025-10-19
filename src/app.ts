import express from 'express';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares/errorHandler';
import violationRoutes from './routes/violationRoutes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Routes
app.get('/', (_, res) => {
  res.json({
    message: 'Vietnam Traffic Violation Lookup API',
    version: '1.0.0',
    author: 'Nhat Cuong',
  });
});

// Monitoring endpoint
app.get('/ping', (_, res) => res.send('pong'));

// Handle favicon.ico requests
app.get('/favicon.ico', (_, res) => {
  res.status(204).end(); // No Content
});

app.use('/api', violationRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
