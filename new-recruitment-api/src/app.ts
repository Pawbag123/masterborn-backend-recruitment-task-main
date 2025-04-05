import express from 'express';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { Database } from 'sqlite/build';

export const setupApp = async (db: Database) => {
  const app = express();

  app.use(express.json());

  app.use(new CandidatesController(new CandidatesService(db)).router);

  return app;
};
