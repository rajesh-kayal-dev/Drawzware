import {
  RegisterInputSchema,
  LoginInputSchema,
  VerifyEmailInputSchema,
  ResendVerificationInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
  RefreshTokenInputSchema,
  type RegisterInput,
  type LoginInput,
  type VerifyEmailInput,
  type ResendVerificationInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type RefreshTokenInput,
} from '@drawzware/contracts';

export {
  RegisterInputSchema,
  LoginInputSchema,
  VerifyEmailInputSchema,
  ResendVerificationInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
  RefreshTokenInputSchema,
};

export type RegisterInputDto = RegisterInput;
export type LoginInputDto = LoginInput;
export type VerifyEmailInputDto = VerifyEmailInput;
export type ResendVerificationInputDto = ResendVerificationInput;
export type ForgotPasswordInputDto = ForgotPasswordInput;
export type ResetPasswordInputDto = ResetPasswordInput;
export type RefreshTokenInputDto = RefreshTokenInput;

