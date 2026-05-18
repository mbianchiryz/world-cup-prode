import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRouter         from './routes/auth.js';
import matchesRouter      from './routes/matches.js';
import predictionsRouter  from './routes/predictions.js';
import groupsRouter       from './routes/groups.js';
import leaderboardRouter  from './routes/leaderboard.js';
import championRouter     from './routes/champion.js';
import resultsRouter      from './routes/results.js';
import fifaSyncRouter     from './routes/fifa-sync.js';

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth',         authRouter);
app.use('/api/matches',      matchesRouter);
app.use('/api/predictions',  predictionsRouter);
app.use('/api/groups',       groupsRouter);
app.use('/api/leaderboard',  leaderboardRouter);
app.use('/api/champion',     championRouter);
app.use('/api/results',      resultsRouter);
app.use('/api/fifa-sync',    fifaSyncRouter);

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
});
