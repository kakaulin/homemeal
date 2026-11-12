"use client";

import { Button, Modal } from "@heroui/react";

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Удалить",
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm leading-6 text-muted">{description}</p>
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="tertiary" onPress={onCancel}>
                Отмена
              </Button>
              <Button variant="danger" onPress={onConfirm}>
                {confirmLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
