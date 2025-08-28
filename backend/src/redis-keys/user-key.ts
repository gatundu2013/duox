export const userRedisKeys = {
  getBalanceStorageKey: (params: { userId: string }) => {
    return `user:balance:${params.userId}`;
  },
  getJwtRefreshTokensStorageKey: (params: { userId: string }) => {
    return `user:jwts:${params.userId}`;
  },
};
