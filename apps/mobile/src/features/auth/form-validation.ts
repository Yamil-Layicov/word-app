import type { LoginRequest, ResetPasswordRequest } from "./model";
import type { RegisterDraft } from "./register-draft";

export type LoginFormValues = {
  email: string;
  password: string;
};

export type LoginFormErrors = {
  email?: string;
  password?: string;
};

export type ForgotPasswordFormValues = {
  email: string;
};

export type ForgotPasswordFormErrors = {
  email?: string;
};

export type ResetPasswordFormValues = {
  token: string;
  password: string;
  confirmPassword: string;
};

export type ResetPasswordFormErrors = {
  token?: string;
  password?: string;
  confirmPassword?: string;
};

export type RegisterFormValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export type RegisterFormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

type FormValidationResult<TData, TErrors> =
  | {
      success: true;
      data: TData;
    }
  | {
      success: false;
      errors: TErrors;
    };

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const AUTH_ACTION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateLoginForm(
  values: LoginFormValues,
): FormValidationResult<LoginRequest, LoginFormErrors> {
  const errors: LoginFormErrors = {};

  validateEmail(values.email, errors);

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (hasErrors(errors)) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email: normalizeEmail(values.email),
      password: values.password,
    },
  };
}

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
): FormValidationResult<ForgotPasswordFormValues, ForgotPasswordFormErrors> {
  const errors: ForgotPasswordFormErrors = {};

  validateEmail(values.email, errors);

  if (hasErrors(errors)) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email: normalizeEmail(values.email),
    },
  };
}

export function validateResetPasswordForm(
  values: ResetPasswordFormValues,
): FormValidationResult<ResetPasswordRequest, ResetPasswordFormErrors> {
  const errors: ResetPasswordFormErrors = {};
  const token = values.token.trim();

  if (!isValidPasswordResetToken(token)) {
    errors.token = "This password reset link is invalid or incomplete.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (hasErrors(errors)) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      token,
      newPassword: values.password,
    },
  };
}

export function isValidPasswordResetToken(token: string): boolean {
  return isValidAuthActionToken(token);
}

export function isValidEmailVerificationToken(token: string): boolean {
  return isValidAuthActionToken(token);
}

export function validateRegisterForm(
  values: RegisterFormValues,
): FormValidationResult<RegisterDraft, RegisterFormErrors> {
  const errors: RegisterFormErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  validateEmail(values.email, errors);

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!values.acceptedTerms) {
    errors.terms = "You need to accept the terms to continue.";
  }

  if (hasErrors(errors)) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      displayName: values.fullName.trim(),
      email: normalizeEmail(values.email),
      password: values.password,
    },
  };
}

function validateEmail(email: string, errors: { email?: string }) {
  if (!email.trim()) {
    errors.email = "Email address is required.";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidAuthActionToken(token: string): boolean {
  return AUTH_ACTION_TOKEN_PATTERN.test(token.trim());
}

function hasErrors(errors: object) {
  return Object.keys(errors).length > 0;
}
