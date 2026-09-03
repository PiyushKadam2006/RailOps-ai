const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');

router.get('/active', recommendationController.getActiveRecommendation);
router.post('/:id/accept', recommendationController.acceptRecommendation);
router.post('/:id/reject', recommendationController.rejectRecommendation);
router.get('/history', recommendationController.getRecommendationHistory);

module.exports = router;
