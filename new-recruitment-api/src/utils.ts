import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult } from 'express-validator/lib';

export const validateReqBody = (validationValues: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(
      validationValues.map((validation) => validation.run(req))
    );
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({
        message: `Invalid inputs passed: ${errors
          .array()
          .map((err) => ' ' + err.msg)}`,
      });
      return;
    }
    next();
  };
};
