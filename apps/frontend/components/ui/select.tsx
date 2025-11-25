'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from "@barzakh/shared/lib/utils/utils";

const ChevronDownAny = ChevronDown as any;
const ChevronUpAny = ChevronUp as any;
const CheckAny = Check as any;

const SelectPrimitiveRootAny = SelectPrimitive.Root as any;
const SelectPrimitiveGroupAny = SelectPrimitive.Group as any;
const SelectPrimitiveValueAny = SelectPrimitive.Value as any;
const SelectPrimitiveTriggerAny = SelectPrimitive.Trigger as any;
const SelectPrimitiveIconAny = SelectPrimitive.Icon as any;
const SelectPrimitiveScrollUpButtonAny = SelectPrimitive.ScrollUpButton as any;
const SelectPrimitiveScrollDownButtonAny = SelectPrimitive.ScrollDownButton as any;
const SelectPrimitiveContentAny = SelectPrimitive.Content as any;
const SelectPrimitivePortalAny = SelectPrimitive.Portal as any;
const SelectPrimitiveViewportAny = SelectPrimitive.Viewport as any;
const SelectPrimitiveLabelAny = SelectPrimitive.Label as any;
const SelectPrimitiveItemAny = SelectPrimitive.Item as any;
const SelectPrimitiveItemIndicatorAny = SelectPrimitive.ItemIndicator as any;
const SelectPrimitiveItemTextAny = SelectPrimitive.ItemText as any;
const SelectPrimitiveSeparatorAny = SelectPrimitive.Separator as any;

const Select = SelectPrimitiveRootAny;

const SelectGroup = SelectPrimitiveGroupAny;

const SelectValue = SelectPrimitiveValueAny;

const SelectTrigger = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitiveTriggerAny
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitiveIconAny asChild>
      <ChevronDownAny className="h-4 w-4 opacity-50" />
    </SelectPrimitiveIconAny>
  </SelectPrimitiveTriggerAny>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <SelectPrimitiveScrollUpButtonAny
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className,
    )}
    {...props}
  >
    <ChevronUpAny className="h-4 w-4" />
  </SelectPrimitiveScrollUpButtonAny>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <SelectPrimitiveScrollDownButtonAny
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className,
    )}
    {...props}
  >
    <ChevronDownAny className="h-4 w-4" />
  </SelectPrimitiveScrollDownButtonAny>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitivePortalAny>
    <SelectPrimitiveContentAny
      ref={ref}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitiveViewportAny
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitiveViewportAny>
      <SelectScrollDownButton />
    </SelectPrimitiveContentAny>
  </SelectPrimitivePortalAny>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <SelectPrimitiveLabelAny
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitiveItemAny
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitiveItemIndicatorAny>
        <CheckAny className="h-4 w-4" />
      </SelectPrimitiveItemIndicatorAny>
    </span>

    <SelectPrimitiveItemTextAny>{children}</SelectPrimitiveItemTextAny>
  </SelectPrimitiveItemAny>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <SelectPrimitiveSeparatorAny
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
