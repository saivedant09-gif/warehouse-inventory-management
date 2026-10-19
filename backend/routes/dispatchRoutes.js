const express = require('express');
const router = express.Router();
const {
  getAllDispatches,
  getDispatchById,
  createDispatch,
  updateDispatch,
  deleteDispatch
} = require('../controllers/dispatchController');

router.route('/')
  .get(getAllDispatches)
  .post(createDispatch);

router.route('/:id')
  .get(getDispatchById)
  .put(updateDispatch)
  .delete(deleteDispatch);

module.exports = router;
