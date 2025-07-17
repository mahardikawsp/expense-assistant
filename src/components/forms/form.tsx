'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import {
  useForm,
  UseFormReturn,
  SubmitHandler,
  UseFormProps,
  FieldValues,
  FieldPath,
  FieldErrors,
} from 'react-hook-form';
import { ZodSchema, z } from 'zod';

import { cn } from '@/lib/utils';

// Form component with React Hook Form integration
interface FormProps<TFormValues extends FieldValues> extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<TFormValues>;
  onSubmit: SubmitHandler<TFormValues>;
  children: React.ReactNode;
}

const Form = <TFormValues extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<TFormValues>) => {
  return (
    <form
      className={cn('space-y-6', className)}
      onSubmit={form.handleSubmit(onSubmit)}
      {...props}
    >
      {children}
    </form>
  );
};
Form.displayName = 'Form';

// Form field component
interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

const FormField = ({ children, className }: FormFieldProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
};
FormField.displayName = 'FormField';

// Form label component
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('text-sm font-medium text-foreground', className)}
        {...props}
      >
        {children}
      </label>
    );
  }
);
FormLabel.displayName = 'FormLabel';

// Form error component
interface FormErrorProps {
  children?: React.ReactNode;
  className?: string;
}

const FormError = ({ children, className }: FormErrorProps) => {
  if (!children) return null;

  return (
    <p className={cn('text-sm text-destructive', className)}>
      {children}
    </p>
  );
};
FormError.displayName = 'FormError';

// Form description component
interface FormDescriptionProps {
  children?: React.ReactNode;
  className?: string;
}

const FormDescription = ({ children, className }: FormDescriptionProps) => {
  if (!children) return null;

  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
};
FormDescription.displayName = 'FormDescription';

// Form control component
interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mt-1', className)} {...props}>
        {children}
      </div>
    );
  }
);
FormControl.displayName = 'FormControl';

// Hook to create a form with Zod validation
interface UseZodFormProps<TSchema extends ZodSchema> extends Omit<UseFormProps<z.infer<TSchema>>, 'resolver'> {
  schema: TSchema;
}

const useZodForm = <TSchema extends ZodSchema>({
  schema,
  ...formProps
}: UseZodFormProps<TSchema>) => {
  return useForm({
    ...formProps,
    resolver: zodResolver(schema),
  });
};

// Helper to get field error message
const getFieldErrorMessage = <TFormValues extends FieldValues>(
  errors: FieldErrors<TFormValues>,
  name: FieldPath<TFormValues>
): string | undefined => {
  const error = errors[name];
  return error?.message as string | undefined;
};

export {
  Form,
  FormField,
  FormLabel,
  FormError,
  FormDescription,
  FormControl,
  useZodForm,
  getFieldErrorMessage,
};