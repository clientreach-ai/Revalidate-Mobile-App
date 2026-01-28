import { asyncHandler } from '../../common/middleware/async-handler'
import { prisma } from '../../lib/prisma'
import { Response, Request } from 'express'
import fs from 'fs'
import path from 'path'
import axios from 'axios'


export const getSlides = asyncHandler(async (_req: Request, res: Response) => {
  const slides = await prisma.sliders.findMany({
    select: { id: true, image: true, name: true, status: true, sort_order: true },
    orderBy: { sort_order: 'asc' },
  })

  // Verify remote/admin-hosted images where files are not present locally.
  const results = await Promise.all(slides.map(async (s) => {
    const raw = s.image ? String(s.image) : ''

    // Determine server-side file paths for local uploads.
    const candidateRelatives = raw.startsWith('/uploads/')
      ? [raw, raw.replace(/^\/uploads\//, '/uploads/sliders/')]
      : [`/uploads/sliders/${raw}`, `/uploads/${raw}`]

    let foundRelative: string | null = null
    for (const rel of candidateRelatives) {
      try {
        const p = path.join(process.cwd(), rel)
        if (fs.existsSync(p)) {
          foundRelative = rel
          break
        }
      } catch (e) {
        // ignore and continue
      }
    }

    // If raw is empty, skip
    if (!raw) return null

    // If it's already a full URL, verify it exists
    if (/^https?:\/\//i.test(raw)) {
      try {
        const head = await axios.head(raw, { timeout: 3000 })
        if (head.status >= 200 && head.status < 400) {
          return { id: String(s.id), image: raw, image_url: raw, name: s.name, status: s.status, sort_order: s.sort_order }
        }
      } catch (e) {
        return null
      }
    }

    // If file exists locally, use API_BASE_URL + relative
    if (foundRelative) {
      const url = process.env.API_BASE_URL ? `${process.env.API_BASE_URL}${foundRelative}` : foundRelative
      return { id: String(s.id), image: raw, image_url: url, name: s.name, status: s.status, sort_order: s.sort_order }
    }

    // Otherwise try configured uploads base or admin host
    const uploadsBase = (process.env.UPLOADS_BASE_URL && String(process.env.UPLOADS_BASE_URL).trim())
      ? String(process.env.UPLOADS_BASE_URL)
      : 'https://revalidate.revalidateapp.com'

    const base = uploadsBase.replace(/\/$/, '')
    const candidates = [`${base}/uploads/sliders/${raw}`, `${base}/uploads/${raw}`]

    for (const u of candidates) {
      try {
        const head = await axios.head(u, { timeout: 3000 })
        if (head.status >= 200 && head.status < 400) {
          return { id: String(s.id), image: raw, image_url: u, name: s.name, status: s.status, sort_order: s.sort_order }
        }
      } catch (e) {
        // continue to next candidate
      }
    }

    // No valid URL found - skip this slide
    return null
  }))

  // Filter out nulls
  const filtered = results.filter(Boolean) as Array<any>
  res.json(filtered)
})

export default getSlides
