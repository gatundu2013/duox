export const userRedisKeys = {
  getBalanceStorageKey: (params: { userId: string }) => {
    const { userId } = params;
    return `user:balance:${userId}`;
  },
  getProfileStorageKey: (params: { userId: string }) => {
    const { userId } = params;
    return `user:profile:${userId}`;
  },
};
