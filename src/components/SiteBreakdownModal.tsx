"use client";

import { Modal } from "@/components/Modal";
import { SiteBreakdownList } from "@/components/SiteBreakdownList";
import type { SiteActivity } from "@/lib/types";

export function SiteBreakdownModal({
  title,
  sites,
  onClose,
}: {
  title: string;
  sites: SiteActivity[];
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <SiteBreakdownList sites={sites} />
    </Modal>
  );
}
