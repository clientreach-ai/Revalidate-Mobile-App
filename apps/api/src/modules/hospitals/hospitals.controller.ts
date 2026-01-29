
import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { getAllHospitals } from './hospitals.model';

/**
 * Get all hospitals
 * GET /api/v1/hospitals
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
    const search = req.query.search as string | undefined;
    const hospitals = await getAllHospitals(search);

    res.json({
        success: true,
        data: hospitals,
    });
});
