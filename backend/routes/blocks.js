const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');

router.get('/', blockController.getAllBlocks);
router.get('/week', blockController.getWeekBlocks);
router.post('/', blockController.createBlock);
router.put('/:id', blockController.updateBlock);

module.exports = router;
