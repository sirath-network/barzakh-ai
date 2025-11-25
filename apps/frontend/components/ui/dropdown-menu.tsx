'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';

import { cn } from "@barzakh/shared/lib/utils/utils";

const ChevronRightAny = ChevronRight as any;
const CheckAny = Check as any;
const CircleAny = Circle as any;

const DropdownMenuPrimitiveRootAny = DropdownMenuPrimitive.Root as any;
const DropdownMenuPrimitiveTriggerAny = DropdownMenuPrimitive.Trigger as any;
const DropdownMenuPrimitiveGroupAny = DropdownMenuPrimitive.Group as any;
const DropdownMenuPrimitivePortalAny = DropdownMenuPrimitive.Portal as any;
const DropdownMenuPrimitiveSubAny = DropdownMenuPrimitive.Sub as any;
const DropdownMenuPrimitiveRadioGroupAny = DropdownMenuPrimitive.RadioGroup as any;
const DropdownMenuPrimitiveSubTriggerAny = DropdownMenuPrimitive.SubTrigger as any;
const DropdownMenuPrimitiveSubContentAny = DropdownMenuPrimitive.SubContent as any;
const DropdownMenuPrimitiveContentAny = DropdownMenuPrimitive.Content as any;
const DropdownMenuPrimitiveItemAny = DropdownMenuPrimitive.Item as any;
const DropdownMenuPrimitiveCheckboxItemAny = DropdownMenuPrimitive.CheckboxItem as any;
const DropdownMenuPrimitiveItemIndicatorAny = DropdownMenuPrimitive.ItemIndicator as any;
const DropdownMenuPrimitiveRadioItemAny = DropdownMenuPrimitive.RadioItem as any;
const DropdownMenuPrimitiveLabelAny = DropdownMenuPrimitive.Label as any;
const DropdownMenuPrimitiveSeparatorAny = DropdownMenuPrimitive.Separator as any;

const DropdownMenu = DropdownMenuPrimitiveRootAny;

const DropdownMenuTrigger = DropdownMenuPrimitiveTriggerAny;

const DropdownMenuGroup = DropdownMenuPrimitiveGroupAny;

const DropdownMenuPortal = DropdownMenuPrimitivePortalAny;

const DropdownMenuSub = DropdownMenuPrimitiveSubAny;

const DropdownMenuRadioGroup = DropdownMenuPrimitiveRadioGroupAny;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitiveSubTriggerAny
    ref={ref}
    className={cn(
      'flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRightAny className="ml-auto" />
  </DropdownMenuPrimitiveSubTriggerAny>
));
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitiveSubContentAny
    ref={ref}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitivePortalAny>
    <DropdownMenuPrimitiveContentAny
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitivePortalAny>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitiveItemAny
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitiveCheckboxItemAny
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitiveItemIndicatorAny>
        <CheckAny className="h-4 w-4" />
      </DropdownMenuPrimitiveItemIndicatorAny>
    </span>
    {children}
  </DropdownMenuPrimitiveCheckboxItemAny>
));
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitiveRadioItemAny
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitiveItemIndicatorAny>
        <CircleAny className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitiveItemIndicatorAny>
    </span>
    {children}
  </DropdownMenuPrimitiveRadioItemAny>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitiveLabelAny
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-sm font-semibold',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitiveSeparatorAny
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
