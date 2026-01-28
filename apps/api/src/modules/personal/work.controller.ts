import { asyncHandler } from '../../common/middleware/async-handler'
import { prisma } from '../../lib/prisma'
import {Response, Request} from 'express'


export const getWorkSettingsList = asyncHandler(async (_req: Request, res: Response) => {
    const works = await prisma.categories.findMany({
        select: { id: true, name: true, status: true },
    })
    const results = works.map(w => ({ id: String(w.id), name: w.name, status: w.status }))
    res.json(results)
})