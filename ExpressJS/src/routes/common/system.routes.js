

const register1 = router => {
  router.get('/health', (req, res) => res.json({ EC: 0, EM: 'OK', data: { status: 'up' } }));
};

module.exports = { register1 };
