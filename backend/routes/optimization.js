const express = require('express');
const router = express.Router();
const optimizationController = require('../controllers/optimizationController');

router.post('/run', optimizationController.runOptimization);
router.post('/approve', optimizationController.approvePlan);
router.get('/conflicts', optimizationController.getConflicts);

module.exports = router;
