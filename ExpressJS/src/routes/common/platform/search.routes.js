
const controller = require('../../../controllers/common/platform/search.controller');

const register1 = router => {
  router.get('/search', controller.search);
};

module.exports = { register1 };
