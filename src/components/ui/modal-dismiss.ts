"use client";

import { type MouseEvent, useCallback, useEffect, useRef } from "react";

type UseModalDismissInput = {
  isOpen: boolean;
  onClose: () => void;
  isDisabled?: boolean;
};

const modalStack: string[] = [];

function removeFromStack(modalId: string) {
  const index = modalStack.lastIndexOf(modalId);
  if (index >= 0) {
    modalStack.splice(index, 1);
  }
}

export function useModalDismiss(input: UseModalDismissInput) {
  const { isOpen, onClose, isDisabled = false } = input;
  const modalIdRef = useRef(`modal-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const modalId = modalIdRef.current;
    modalStack.push(modalId);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (modalStack[modalStack.length - 1] !== modalId) {
        return;
      }

      if (isDisabled) {
        return;
      }

      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      removeFromStack(modalId);
    };
  }, [isOpen, isDisabled, onClose]);

  const onBackdropMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isDisabled) {
        return;
      }

      if (event.target !== event.currentTarget) {
        return;
      }

      onClose();
    },
    [isDisabled, onClose],
  );

  return {
    onBackdropMouseDown,
  };
}
