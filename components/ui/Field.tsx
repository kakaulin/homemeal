"use client";

import { Input, Label, ListBox, Select, TextArea, TextField } from "@heroui/react";

import { cn } from "@/lib/cn";

type FieldShellProps = {
  label: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  className?: string;
};

function Message({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return <p className="mt-1 text-xs font-medium text-danger">{error}</p>;
  }
  if (hint) {
    return <p className="mt-1 text-xs text-muted">{hint}</p>;
  }
  return null;
}

type TextInputProps = FieldShellProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
};

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  isRequired,
  className,
  autoFocus,
  maxLength,
}: TextInputProps) {
  return (
    <TextField
      className={cn("w-full", className)}
      fullWidth
      isRequired={isRequired}
      isInvalid={Boolean(error)}
      value={value}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <Input
        fullWidth
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={maxLength}
      />
      <Message error={error} hint={hint} />
    </TextField>
  );
}

type NumberInputProps = FieldShellProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  autoFocus?: boolean;
  /** Скрыть подпись визуально, оставив её для скринридера. */
  hideLabel?: boolean;
};

export function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  error,
  hint,
  isRequired,
  className,
  autoFocus,
  hideLabel,
}: NumberInputProps) {
  return (
    <TextField
      className={cn("w-full", className)}
      fullWidth
      isRequired={isRequired}
      isInvalid={Boolean(error)}
      value={value}
      onChange={onChange}
    >
      <Label className={hideLabel ? "sr-only" : undefined}>{label}</Label>
      <div className="relative">
        <Input
          fullWidth
          inputMode="decimal"
          placeholder={placeholder ?? "0"}
          autoFocus={autoFocus}
          className={suffix ? "pr-20" : undefined}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs whitespace-nowrap text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      <Message error={error} hint={hint} />
    </TextField>
  );
}

export type SelectOption = { id: string; label: string };

type SelectFieldProps = FieldShellProps & {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  isDisabled?: boolean;
  /** Скрыть подпись визуально, оставив её для скринридера. */
  hideLabel?: boolean;
};

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  hint,
  isRequired,
  className,
  isDisabled,
  hideLabel,
}: SelectFieldProps) {
  return (
    <Select
      className={cn("w-full", className)}
      fullWidth
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={Boolean(error)}
      placeholder={placeholder}
      selectedKey={value === "" ? null : value}
      onSelectionChange={(key) => onChange(key == null ? "" : String(key))}
    >
      <Label className={hideLabel ? "sr-only" : undefined}>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.id}
              id={option.id}
              textValue={option.label}
            >
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      <Message error={error} hint={hint} />
    </Select>
  );
}

type TextAreaInputProps = FieldShellProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

export function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
  rows,
  error,
  hint,
  className,
}: TextAreaInputProps) {
  return (
    <TextField
      className={cn("w-full", className)}
      fullWidth
      value={value}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <TextArea fullWidth rows={rows} placeholder={placeholder} />
      <Message error={error} hint={hint} />
    </TextField>
  );
}
