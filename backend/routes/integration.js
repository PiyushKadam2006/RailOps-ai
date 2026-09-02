const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');

router.get('/metrics', integrationController.getMetrics);

module.exports = router;
