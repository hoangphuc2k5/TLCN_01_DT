function toSafeObject(user) {
  const value = user?.toObject ? user.toObject() : { ...user };
  delete value.password;
  delete value.security;
  return value;
}

module.exports = { toSafeObject };
