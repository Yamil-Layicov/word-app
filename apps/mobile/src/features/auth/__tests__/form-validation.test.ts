/// <reference types="jest" />

import {
  validateForgotPasswordForm,
  validateLoginForm,
  validateRegisterForm,
} from "../form-validation";

describe("validateForgotPasswordForm", () => {
  it("returns a required error for an empty email", () => {
    expect(validateForgotPasswordForm({ email: " " })).toEqual({
      success: false,
      errors: {
        email: "Email address is required.",
      },
    });
  });

  it("rejects an invalid email", () => {
    expect(validateForgotPasswordForm({ email: "not-an-email" })).toEqual({
      success: false,
      errors: {
        email: "Enter a valid email address.",
      },
    });
  });

  it("normalizes a valid email", () => {
    expect(
      validateForgotPasswordForm({ email: "  USER@Example.COM " }),
    ).toEqual({
      success: true,
      data: {
        email: "user@example.com",
      },
    });
  });
});

describe("validateLoginForm", () => {
  it("returns required errors for an empty form", () => {
    expect(validateLoginForm({ email: "   ", password: "" })).toEqual({
      success: false,
      errors: {
        email: "Email address is required.",
        password: "Password is required.",
      },
    });
  });

  it("rejects an invalid email and a short password", () => {
    expect(
      validateLoginForm({
        email: "not-an-email",
        password: "short",
      }),
    ).toEqual({
      success: false,
      errors: {
        email: "Enter a valid email address.",
        password: "Password must be at least 8 characters.",
      },
    });
  });

  it("normalizes the email and preserves the password", () => {
    expect(
      validateLoginForm({
        email: "  USER@Example.COM ",
        password: " password ",
      }),
    ).toEqual({
      success: true,
      data: {
        email: "user@example.com",
        password: " password ",
      },
    });
  });
});

describe("validateRegisterForm", () => {
  it("returns all required errors for an empty form", () => {
    expect(
      validateRegisterForm({
        fullName: " ",
        email: "",
        password: "",
        confirmPassword: "",
        acceptedTerms: false,
      }),
    ).toEqual({
      success: false,
      errors: {
        fullName: "Full name is required.",
        email: "Email address is required.",
        password: "Password is required.",
        confirmPassword: "Confirm your password.",
        terms: "You need to accept the terms to continue.",
      },
    });
  });

  it("rejects a mismatched password and unaccepted terms", () => {
    expect(
      validateRegisterForm({
        fullName: "Yamil",
        email: "user@example.com",
        password: "password",
        confirmPassword: "different",
        acceptedTerms: false,
      }),
    ).toEqual({
      success: false,
      errors: {
        confirmPassword: "Passwords do not match.",
        terms: "You need to accept the terms to continue.",
      },
    });
  });

  it("returns a normalized registration draft for valid values", () => {
    expect(
      validateRegisterForm({
        fullName: "  Yamil Test  ",
        email: "  USER@Example.COM ",
        password: "password",
        confirmPassword: "password",
        acceptedTerms: true,
      }),
    ).toEqual({
      success: true,
      data: {
        displayName: "Yamil Test",
        email: "user@example.com",
        password: "password",
      },
    });
  });
});
