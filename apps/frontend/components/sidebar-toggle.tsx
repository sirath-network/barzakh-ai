import type { ComponentProps } from 'react';
import { type SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarLeftIcon } from './icons';
import { Button } from './ui/button';

const TooltipAny = Tooltip as any;
const TooltipTriggerAny = TooltipTrigger as any;
const TooltipContentAny = TooltipContent as any;
const ButtonAny = Button as any;

export function SidebarToggle({
  className,
}: ComponentProps<typeof SidebarTrigger>) {
  const { toggleSidebar } = useSidebar();

  return (
    <TooltipAny>
      <TooltipTriggerAny asChild>
        <ButtonAny
          onClick={toggleSidebar}
          variant="outline"
          size="sm"
          className="h-9 px-3 border-border/50 hover:bg-muted/60 hover:border-primary/30 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md rounded-lg bg-background/80 backdrop-blur-sm"
        >
          <span className="text-muted-foreground hover:text-primary transition-colors duration-200"><SidebarLeftIcon size={16} /></span>
        </ButtonAny>
      </TooltipTriggerAny>
      <TooltipContentAny align="start" className="font-medium">
        Toggle Sidebar
      </TooltipContentAny>
    </TooltipAny>
  );
}