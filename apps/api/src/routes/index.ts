import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import workHoursRoutes from './work-hours.routes';
import cpdHoursRoutes from './cpd-hours.routes';
import feedbackRoutes from './feedback.routes';
import reflectionsRoutes from './reflections.routes';
import appraisalRoutes from './appraisal.routes';
import adminRoutes from './admin.routes';
import paymentRoutes from './payment.routes';
import documentsRoutes from './documents.routes';
import calendarRoutes from './calendar.routes';
import notificationsRoutes from './notifications.routes';
import profileRoutes from './profile.routes';
import slidersRoutes from './sliders.routes';
// TODO: Add more routes as modules are implemented
// import analyticsRoutes from './analytics.routes';
// import subscriptionRoutes from './subscription.routes';
// import syncRoutes from './sync.routes';
// import exportRoutes from './export.routes';

const router = Router();

console.log('🔎 routes/index.ts loaded');

// API version prefix
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/work-hours`, workHoursRoutes);
router.use(`${API_VERSION}/cpd-hours`, cpdHoursRoutes);
router.use(`${API_VERSION}/feedback`, feedbackRoutes);
router.use(`${API_VERSION}/reflections`, reflectionsRoutes);
router.use(`${API_VERSION}/appraisals`, appraisalRoutes);
router.use(`${API_VERSION}/admin`, adminRoutes);
router.use(`${API_VERSION}/payment`, paymentRoutes);
router.use(`${API_VERSION}/documents`, documentsRoutes);
router.use(`${API_VERSION}/calendar`, calendarRoutes);
router.use(`${API_VERSION}/notifications`, notificationsRoutes);
router.use(`${API_VERSION}/profile`, profileRoutes);
router.use(`${API_VERSION}/sliders`, slidersRoutes);
console.log(`🔎 mounted sliders routes at ${API_VERSION}/sliders`);
console.log(`🔎 mounted profile routes at ${API_VERSION}/profile`);
// TODO: Mount additional routes as they're implemented
// router.use(`${API_VERSION}/analytics`, analyticsRoutes);
// router.use(`${API_VERSION}/subscription`, subscriptionRoutes);
// router.use(`${API_VERSION}/sync`, syncRoutes);
// router.use(`${API_VERSION}/export`, exportRoutes);

// API info endpoint
router.get(`${API_VERSION}`, (_req, res) => {
  res.json({
    message: 'Revalidation Tracker API v1',
    version: '1.0.0',
    endpoints: {
      auth: `${API_VERSION}/auth`,
      users: `${API_VERSION}/users`,
      workHours: `${API_VERSION}/work-hours`,
      cpdHours: `${API_VERSION}/cpd-hours`,
      feedback: `${API_VERSION}/feedback`,
      reflections: `${API_VERSION}/reflections`,
      appraisals: `${API_VERSION}/appraisals`,
      documents: `${API_VERSION}/documents`,
      calendar: `${API_VERSION}/calendar`,
      notifications: `${API_VERSION}/notifications`,
      // Additional endpoints will be listed as they're added
    },
  });
});

export default router;
