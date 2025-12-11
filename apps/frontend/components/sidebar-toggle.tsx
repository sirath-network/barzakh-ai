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
          variant="ghost"
          size="sm"
          className="h-9 px-3 hover:bg-transparent transition-all duration-200"
        >
          <span className="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors duration-200"><SidebarLeftIcon size={16} /></span>
        </ButtonAny>
      </TooltipTriggerAny>
      <TooltipContentAny align="start" className="font-medium">
        Open sidebar
      </TooltipContentAny>
    </TooltipAny>
  );
}