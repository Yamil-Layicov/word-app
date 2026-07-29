import type { LoginRequest } from "./model";
import type { RegisterDraft } from "./register-draft";

export type LoginFormValues = {
  email: string;
  password: string;
};

export type LoginFormErrors = {
  email?: string;
  password?: string;
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

function validateEmail(
  email: string,
  errors: Pick<LoginFormErrors, "email">,
) {
  if (!email.trim()) {
    errors.email = "Email address is required.";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hasErrors(errors: object) {
  return Object.keys(errors).length > 0;
}
