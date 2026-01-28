import { asyncHandler } from '../../common/middleware/async-handler'
import { prisma } from '../../lib/prisma'
import {Response, Request} from 'express'


export const getWorkSettingsList = asyncHandler(async (_req: Request, res: Response) => {
    const works = await prisma.categories.findMany({
        select: { name: true },
    })
    const names = works.map(w => w.name)
    res.json(names)
})