import { Request, Response } from 'express';
import { body } from 'express-validator/lib';
import { Database } from 'sqlite/build';
import { validateReqBody } from './utils';
import { Candidate } from './candidates.model';
import { CANDIDATES_PER_PAGE } from './constants';

export class CandidatesService {
  constructor(private readonly db: Database) {}

  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * CANDIDATES_PER_PAGE;

    try {
      const candidates = await this.db.all<Candidate[]>(
        'SELECT * FROM candidate LIMIT ? OFFSET ?',
        CANDIDATES_PER_PAGE,
        offset
      );

      const totalCandidates = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM candidate'
      );
      const totalPages = Math.ceil(totalCandidates.count / CANDIDATES_PER_PAGE);

      const response = {
        candidates,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
      };
      res.json(response);
      console.log('Fetched candidates successfully');
    } catch (error) {
      console.error('Error fetching candidates:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getByJobOfferId(req: Request, res: Response) {
    const jobOfferId = parseInt(req.params.job_offer_id as string);
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * CANDIDATES_PER_PAGE;

    if (isNaN(jobOfferId)) {
      return res.status(400).json({ message: 'Invalid job offer ID' });
    }

    try {
      const candidates = await this.db.all<Candidate[]>(
        `SELECT c.* FROM candidate c
            JOIN CandidateJobOffer co ON c.id = co.candidate_id
            WHERE co.job_offer_id = ? LIMIT ? OFFSET ?`,
        jobOfferId,
        CANDIDATES_PER_PAGE,
        offset
      );

      const totalCandidates = await this.db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM candidate c
            JOIN CandidateJobOffer co ON c.id = co.candidate_id
            WHERE co.job_offer_id = ?`,
        jobOfferId
      );
      const totalPages = Math.ceil(totalCandidates.count / CANDIDATES_PER_PAGE);

      const response = {
        candidates,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
      };
      res.json(response);
      console.log('Fetched candidates by job offer ID successfully');
    } catch (error) {
      console.error('Error fetching candidates:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async create(req: Request, res: Response) {
    const candidate: Candidate = req.body;

    const transaction = await this.db.run('BEGIN TRANSACTION');
    try {
      await this.postCandidateToDb(candidate);
      await this.updateLegacyApi(candidate);

      await this.db.run('COMMIT');
      console.log('Candidate created successfully');
    } catch (error) {
      await this.db.run('ROLLBACK');
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
    return res.status(201).json({ message: 'Candidate created successfully' });
  }

  private async postCandidateToDb(candidate: Candidate) {
    const { name, surname, email, phone, years_of_experience, job_offers } =
      candidate;

    const sql = `INSERT INTO candidate (name, surname, email, phone, years_of_experience) VALUES (?, ?, ?, ?, ?)`;
    const params = [name, surname, email, phone, years_of_experience];
    await this.db.run(sql, params);

    const candidateId = await this.db.get<{ id: number }>(
      'SELECT last_insert_rowid() AS id'
    );

    const jobOfferSql = `INSERT INTO CandidateJobOffer (candidate_id, job_offer_id) VALUES (?, ?)`;
    for (const job_offer_id of job_offers) {
      await this.db.run(jobOfferSql, [candidateId.id, job_offer_id]);
    }
  }

  private async updateLegacyApi(candidate: Candidate) {
    const legacyCandidate = {
      firstName: candidate.name,
      lastName: candidate.surname,
      email: candidate.email,
    };
    try {
      const response = await fetch(process.env.LEGACY_API_URL + '/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.LEGACY_API_KEY,
        },
        body: JSON.stringify(legacyCandidate),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        console.error(
          `Failed to update legacy API. Status: ${response.status}, Message: ${errorMessage}`
        );
        throw new Error('Failed to update legacy API.');
      }

      console.log('Legacy API updated successfully');
    } catch (error) {
      console.error('Error updating legacy API:', error.message);
      throw new Error('Error updating legacy API');
    }
  }

  public validateCandidateRequestInput = validateReqBody([
    body('name').notEmpty().withMessage('Name is required'),
    body('surname').notEmpty().withMessage('Surname is required'),
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .custom(async (email) => {
        const existingCandidate = await this.db.get(
          'SELECT * FROM candidate WHERE email = ?',
          email
        );
        if (existingCandidate) {
          throw new Error('Email must be unique');
        }
        return true;
      }),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('years_of_experience')
      .isInt({ min: 0 })
      .withMessage('Years of experience must be an integer'),
    body('job_offers')
      .isArray({ min: 1 })
      .withMessage('Job offers must contain at least one job offer ID')
      .custom(async (job_offers: number[]) => {
        for (const job_offer_id of job_offers) {
          const existingJobOffer = await this.db.get(
            'SELECT * FROM JobOffer WHERE id = ?',
            job_offer_id
          );
          if (!existingJobOffer) {
            throw new Error(
              `Job offer ID ${job_offer_id} must reference an existing job offer`
            );
          }
        }
        return true;
      }),
  ]);
}
