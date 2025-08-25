// ------------- Auth Enums -------------
export enum OtpPurposeEnum {
  REGISTER = "register",
  RESET_PASSWORD = "reset_password",
  CHANGE_PASSWORD = "change_password",
}

// ------------- User Enums -------------
export enum UserRoleEnum {
  ADMIN = "admin",
  PLAYER = "player",
}

// ------------- Betting Enums -----------
export enum BetStatusEnum {
  PENDING = "pending",
  BUSTED = "busted",
  WON = "won",
}

// ------------- Game Enums -------------
export enum VehicleTypeEnum {
  MATATU = "matatu",
  BODABODA = "bodaboda",
}

export enum RoundStatusEnum {
  PENDING = "pending",
  RUNNING = "running",
  ENDED = "ended",
}
