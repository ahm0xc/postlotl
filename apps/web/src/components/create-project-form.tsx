import { useState } from "react";

import { Banner, BannerDescription, BannerTitle } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
        <FieldLabel htmlFor="create-project-name">Project name</FieldLabel>
        <Input id="create-project-name" name="projectName" required maxLength={100} />
      </Field>
      {error && (
        <Banner status="error">
          <BannerTitle>Could not create project</BannerTitle>
          <BannerDescription>{error}</BannerDescription>
        </Banner>
      )}
    </>
  );
}

export function CreateProjectForm({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const { error, pending, onSubmit } = useCreateProjectSubmit(onCreate);

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <CreateProjectFields error={error} />
      <Button type="submit" className="w-full" loading={pending}>
        Create project
      </Button>
    </form>
  );
}
