import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { Form } from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { useState } from "react";

export function useCreateProjectSubmit(onCreate: (name: string) => Promise<void>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      await onCreate(String(form.get("projectName")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setPending(false);
    }
  }

  return { error, pending, onSubmit };
}

export function CreateProjectFields({ error }: { error: string | null }) {
  return (
    <>
      <Field>
        <FieldLabel>Project name</FieldLabel>
        <Input name="projectName" required maxLength={100} />
      </Field>
      {error && (
        <Alert variant="error" role="alert">
          <AlertTitle>Could not create project</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
}

export function CreateProjectForm({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const { error, pending, onSubmit } = useCreateProjectSubmit(onCreate);

  return (
    <Form className="grid gap-4" onSubmit={onSubmit}>
      <CreateProjectFields error={error} />
      <Button type="submit" width="full" loading={pending}>
        Create project
      </Button>
    </Form>
  );
}
