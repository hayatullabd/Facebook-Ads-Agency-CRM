export const serializePublicUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.password;
  return data;
};
