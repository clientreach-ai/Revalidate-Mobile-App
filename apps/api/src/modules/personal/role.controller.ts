import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import { prisma } from '../../lib/prisma';
import { Request, Response } from 'express';


export const getRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await prisma.role_masters.findMany(
    {
      select: {
        name: true,
        status: true,
        type: true,
      }
    }
  );
  const results = roles.map(role => ({
    name: role.name,
    status: role.status,
    type: role.type,
  }));
  res.json({ roles: results });
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = await prisma.role_masters.findUnique({
    where: {
      id: Number(id),
    },
  });
  if (!role) {
    throw new ApiError(404, 'Role not found');
  }
  const safeRole = {
    ...role,
    id: role.id.toString(),
  };
  res.json(safeRole);
});
