const express = require('express');
const router = express.Router();
const defectController = require('../controllers/defectController');

router.get('/', defectController.getAllDefects);
router.get('/pending', defectController.getOldestPending);
router.get('/count', defectController.getPendingCount);
router.post('/', defectController.createDefect);
router.put('/:id', defectController.updateDefect);

module.exports = router;
