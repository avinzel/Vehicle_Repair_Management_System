"use client"

import { forwardRef, useImperativeHandle, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const PHONE_REGEX = /^09\d{2}[-\s]?\d{3}[-\s]?\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DEFAULT_CUSTOMER_VALUES = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
};

// Pure validation function so it's easy to unit test / reuse
function validateField(name, value) {
  const trimmed = value.trim();

  switch (name) {
    case "firstName":
      if (!trimmed) return "First name is required";
      if (trimmed.length < 2) return "First name must be at least 2 characters";
      return "";
    case "lastName":
      if (!trimmed) return "Last name is required";
      if (trimmed.length < 2) return "Last name must be at least 2 characters";
      return "";
    case "phone":
      if (!trimmed) return "Phone number is required";
      if (!PHONE_REGEX.test(trimmed)) return "Enter a valid PH mobile number (e.g. 0917-000-0000)";
      return "";
    case "email":
      if (!trimmed) return "Email address is required";
      if (!EMAIL_REGEX.test(trimmed)) return "Enter a valid email address";
      return "";
    default:
      return "";
  }
}

const FIELD_NAMES = ["firstName", "lastName", "phone", "email"];

// `values` + `onFieldChange` come from the parent stepper so the data
// survives switching between steps. This component only owns UI-only
// state: which errors to show, and whether the user has tried to submit.
export const CustomerForm = forwardRef(function CustomerForm(
  { values, onFieldChange },
  ref
) {
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (name) => (e) => {
    const value = e.target.value;
    onFieldChange(name, value);
    // Once the user has attempted "Next" once, keep validating live
    // so the error clears as soon as they fix it.
    if (submitted) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const validateAll = () => {
    const nextErrors = {};
    FIELD_NAMES.forEach((name) => {
      nextErrors[name] = validateField(name, values[name]);
    });
    setErrors(nextErrors);
    setSubmitted(true);
    return Object.values(nextErrors).every((err) => !err);
  };

  useImperativeHandle(ref, () => ({
    validate: async () => validateAll(),
    getValues: () => values,
    submit: async () => (validateAll() ? values : null),
  }));

  const showError = (name) => submitted && errors[name];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6">Customer Information</h3>

      <form className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="Juan"
            value={values.firstName}
            onChange={handleChange("firstName")}
            aria-invalid={!!showError("firstName")}
          />
          {showError("firstName") && (
            <p className="text-sm text-destructive">{errors.firstName}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Dela Cruz"
            value={values.lastName}
            onChange={handleChange("lastName")}
            aria-invalid={!!showError("lastName")}
          />
          {showError("lastName") && (
            <p className="text-sm text-destructive">{errors.lastName}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="0917-000-0000"
            value={values.phone}
            onChange={handleChange("phone")}
            aria-invalid={!!showError("phone")}
          />
          {showError("phone") && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="juan@email.com"
            value={values.email}
            onChange={handleChange("email")}
            aria-invalid={!!showError("email")}
          />
          {showError("email") && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>
      </form>
    </div>
  );
});