"use client";

import { PanelLeftIcon, PenSquareIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useCallback } from "react";
import { SidebarHistory } from "@/components/chat/sidebar-history";
import { SidebarUserNav } from "@/components/chat/sidebar-user-nav";
import { BrandLogo } from "@/components/reverse-alignment/brand-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// "Delete all" removed for the demo; the dashboard button lives top right in the chat header.
export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, toggleSidebar } = useSidebar();

  const closeMobile = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleNewChat = useCallback(() => {
    setOpenMobile(false);
    router.push("/");
  }, [router, setOpenMobile]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pt-3 pb-1">
        <SidebarMenu>
          <SidebarMenuItem className="flex flex-row items-center justify-between">
            {/* Collapsed rail: the mark, which turns into "open sidebar" on hover */}
            <div className="group/logo relative hidden items-center justify-center group-data-[collapsible=icon]:flex">
              <SidebarMenuButton
                asChild
                className="size-8 !p-0 items-center justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:group-hover/logo:opacity-0"
                tooltip="PromptFlip"
              >
                <Link href="/" onClick={closeMobile}>
                  <BrandLogo showName={false} size={28} />
                </Link>
              </SidebarMenuButton>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    className="pointer-events-none absolute inset-0 size-8 opacity-0 group-data-[collapsible=icon]:pointer-events-auto group-data-[collapsible=icon]:group-hover/logo:opacity-100"
                    onClick={handleToggleSidebar}
                  >
                    <PanelLeftIcon className="size-4" />
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent className="hidden md:block" side="right">
                  Open sidebar
                </TooltipContent>
              </Tooltip>
            </div>
            {/* Open sidebar: the full logo, larger */}
            <Link
              className="px-1 py-1 text-sidebar-foreground text-xl group-data-[collapsible=icon]:hidden"
              href="/"
              onClick={closeMobile}
            >
              <BrandLogo className="gap-2.5" size={40} />
            </Link>
            <div className="group-data-[collapsible=icon]:hidden">
              <SidebarTrigger className="text-sidebar-foreground/60 transition-colors duration-150 hover:text-sidebar-foreground" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pt-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-8 rounded-lg border border-primary/40 text-[13px] text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  onClick={handleNewChat}
                  tooltip="New Chat"
                >
                  <PenSquareIcon className="size-4 text-primary" />
                  <span className="font-medium">New chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
        {user ? <SidebarUserNav user={user} /> : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
