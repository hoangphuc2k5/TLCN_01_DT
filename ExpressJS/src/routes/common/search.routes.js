
const controller = require('../../controllers/common/search.controller');

const register1 = router => {
  router.get('/search', controller.search);
};

module.exports = { register1 };
