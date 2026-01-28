import { Router } from 'express'
import { getSlides } from '../modules/sliders/slider.controller'

console.log('🔎 sliders.routes.ts loaded')

const router = Router()

router.get('/', getSlides)

export default router
