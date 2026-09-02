const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');

router.post('/whatif', simulationController.runWhatIf);
router.post('/what-if', simulationController.runWhatIf);
router.post('/reoptimize', simulationController.runWhatIf);
router.get('/scenarios', simulationController.getScenarios);

module.exports = router;
