import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ds';

interface AuthTokenFieldProps {
  hasToken: boolean;
  onClear: () => void;
  onSave: (token: string) => void;
  token: string;
}

export function AuthTokenField({
  hasToken,
  onClear,
  onSave,
  token,
}: AuthTokenFieldProps): JSX.Element {
  const [draft, setDraft] = useState(token);

  useEffect(() => {
    setDraft(token);
  }, [token]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSave(draft);
  }

  return (
    <div className="auth-token-field">
      <p className="dictionary-editor__copy">
        Protected HR/admin actions use the bearer token stored in your browser. The token is kept
        locally and is not rendered back after save.
      </p>

      <form className="entity-form" onSubmit={handleSubmit}>
        <label className="field field--full">
          <span className="field__label">Bearer Token</span>
          <textarea
            className="field__control field__control--textarea"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Paste a bearer token minted through the Docker backend helper."
            value={draft}
          />
        </label>

        <div className="entity-form__actions entity-form__actions--split">
          <Button variant="secondary" onClick={onClear} type="button">
            Clear token
          </Button>
          <Button variant="primary" type="submit">
            Save token
          </Button>
        </div>
      </form>

      <p className="auth-token-field__status">
        {hasToken ? 'A local bearer token is currently saved.' : 'No bearer token is saved yet.'}
      </p>
    </div>
  );
}
