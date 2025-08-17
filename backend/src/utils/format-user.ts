import { SelectUserT } from "../db/schema/user";

export function formatUser(params: {
  userData: SelectUserT;
}): Partial<SelectUserT> {
  const { userData } = params;

  return {
    phoneNumber: userData.phoneNumber,
    username: userData.username,
    isActive: userData.isActive,
    createdAt: userData.createdAt,
    accountBalance: userData.accountBalance,
    avatarUrl: userData.avatarUrl,
  };
}
