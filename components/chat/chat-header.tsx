"use client";

import { BarChart3Icon, PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { BrandLogo } from "@/components/reverse-alignment/brand-logo";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import type { VisibilityType } from "./visibility-selector";

// Props kept for the memo comparison below; the visibility selector is hidden for the demo.
// Always rendered (also with the sidebar collapsed) so the dashboard button stays top right.
function PureChatHeader({
  chatId: _chatId,
  selectedVisibilityType: _selectedVisibilityType,
  isReadonly: _isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 flex h-14 items-center gap-2 bg-sidebar px-3">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      {/* desktop shows the logo in the sidebar; mobile has no sidebar, so show it here */}
      <BrandLogo className="md:hidden" size={28} />

      <Button
        asChild
        className="ml-auto gap-1.5 border-primary/40 hover:bg-primary/10"
        size="sm"
        variant="outline"
      >
        <Link href="/dashboard">
          <BarChart3Icon className="size-4 text-primary" />
          Dashboard
        </Link>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(
  PureChatHeader,
  (prevProps, nextProps) =>
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
);
