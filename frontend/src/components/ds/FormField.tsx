import { ReactNode, useId } from 'react';

interface FormFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Optional id; one is auto-generated if not provided. Passed to children
   *  via cloning is intentionally NOT done — consumers wire `htmlFor` and `id`
   *  through the `for`/`id` callback if they need a custom layout. The simple
   *  case (single `<Input>` / `<Textarea>` / `<Select>` child) gets the id
   *  threaded automatically. */
  id?: string;
  className?: string;
  children: ReactNode | ((props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode);
}

/**
 * Phase DS-3-1 — labelled form field shell. Owns the label, hint, error,
 * required-asterisk, and id wiring so individual atoms (Input/Textarea/Select)
 * stay focused on their own concerns.
 *
 * Usage (simple — children is a single atom):
 *   <FormField label="Email" required>
 *     {(props) => <Input type="email" {...props} />}
 *   </FormField>
 *
 * Usage (composite — multi-input layout):
 *   <FormField label="Date range">
 *     <Input type="date" /> <Input type="date" />
 *   </FormField>
 */
export function FormField({
  label,
  hint,
  error,
  required = false,
  id: idProp,
  className,
  children,
}: FormFieldProps): JSX.Element {
  const reactId = useId();
  const id = idProp ?? `ff-${reactId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const childProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  };

  const renderedChildren = typeof children === 'function' ? children(childProps) : children;

  return (
    <div className={['ds-form-field', error && 'ds-form-field--invalid', className].filter(Boolean).join(' ')}>
      <label className="ds-form-field__label" htmlFor={id}>
        {label}
        {required && <span className="ds-form-field__required" aria-hidden> *</span>}
      </label>
      {hint && (
        <p id={hintId} className="ds-form-field__hint">
          {hint}
        </p>
      )}
      <div className="ds-form-field__control">{renderedChildren}</div>
      {error && (
        <p id={errorId} className="ds-form-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
