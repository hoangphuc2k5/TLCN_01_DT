const getAppName = () => (process.env.APP_NAME || 'EduMoet').trim() || 'EduMoet';

module.exports = { getAppName };
