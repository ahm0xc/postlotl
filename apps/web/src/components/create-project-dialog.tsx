import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Form } from "@repo/ui/components/form";

import { CreateProjectFields, useCreateProjectSubmit } from "./create-project-form";

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const { error, pending, onSubmit } = useCreateProjectSubmit(onCreate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <Form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create new project</DialogTitle>
            <DialogDescription>Projects group the work of your organization.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-4">
            <CreateProjectFields error={error} />
          </DialogPanel>
          <DialogFooter>
            <Button type="submit" loading={pending}>
              Create project
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
