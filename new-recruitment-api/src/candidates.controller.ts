import { Request, Response, Router } from 'express';
import { CandidatesService } from './candidates.service';

export class CandidatesController {
  readonly router = Router();
  private candidatesService: CandidatesService;

  constructor(candidatesService: CandidatesService) {
    this.candidatesService = candidatesService;
    this.router.get('/candidates', this.getAll.bind(this));
    this.router.get(
      '/candidates/job-offer/:job_offer_id',
      this.getByJobOfferId.bind(this)
    );
    this.router.post(
      '/candidates',
      this.candidatesService.validateCandidateRequestInput,
      this.create.bind(this)
    );
  }

  async getAll(req: Request, res: Response) {
    try {
      await this.candidatesService.getAll(req, res);
    } catch (error) {
      console.error('Error fetching candidates:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getByJobOfferId(req: Request, res: Response) {
    try {
      await this.candidatesService.getByJobOfferId(req, res);
    } catch (error) {
      console.error(
        'Error fetching candidates by job offer ID:',
        error.message
      );
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      await this.candidatesService.create(req, res);
    } catch (error) {
      console.error('Error creating candidate:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
