import { asyncHandler } from '../../common/middleware/async-handler'
import { prisma } from '../../lib/prisma'
import { Response, Request } from 'express'


export const getRegistrationList = asyncHandler(async (_req: Request, res: Response) => {
  // Registration values are stored in the `portfolios` table in the seed data.
  // Return id/name/status so frontend can filter by status.
  const regs = await prisma.portfolios.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { id: 'asc' },
  })

  const results = regs.map(r => ({ id: String(r.id), name: r.name, status: r.status }))
  res.json(results)
})

export default getRegistrationList
