const express = require('express');
const router = express.Router();
const {
  getAllSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection
} = require('../controllers/sectionController');

router.route('/')
  .get(getAllSections)
  .post(createSection);

router.route('/:id')
  .get(getSectionById)
  .put(updateSection)
  .delete(deleteSection);

module.exports = router;
