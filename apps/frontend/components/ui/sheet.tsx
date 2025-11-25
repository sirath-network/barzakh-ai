'use client';

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from "@barzakh/shared/lib/utils/utils";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const SheetPrimitiveRootAny = SheetPrimitive.Root as any;
const SheetPrimitiveTriggerAny = SheetPrimitive.Trigger as any;
const SheetPrimitiveCloseAny = SheetPrimitive.Close as any;
const SheetPrimitivePortalAny = SheetPrimitive.Portal as any;
const SheetPrimitiveOverlayAny = SheetPrimitive.Overlay as any;
const SheetPrimitiveContentAny = SheetPrimitive.Content as any;
const SheetPrimitiveTitleAny = SheetPrimitive.Title as any;
const SheetPrimitiveDescriptionAny = SheetPrimitive.Description as any;
const XAny = X as any;

const Sheet = SheetPrimitiveRootAny;
const SheetTrigger = SheetPrimitiveTriggerAny;
const SheetClose = SheetPrimitiveCloseAny;
const SheetPortal = SheetPrimitivePortalAny;

const SheetOverlay = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <SheetPrimitiveOverlayAny
    className={cn(
      'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-300', // Changed
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom: 'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right: 'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<any>,
    VariantProps<typeof sheetVariants> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  hideTitleVisually?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<any>,
  SheetContentProps
>(
  (
    {
      side = 'right',
      className,
      children,
      title = '',
      description,
      hideTitleVisually = false,
      ...props
    },
    ref
  ) => (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitiveContentAny
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        <SheetHeader>
          {hideTitleVisually ? (
            <VisuallyHidden>
              <SheetTitle>{title}</SheetTitle>
            </VisuallyHidden>
          ) : (
            <SheetTitle>{title}</SheetTitle>
          )}
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        {children}

        <SheetPrimitiveCloseAny className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <XAny className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitiveCloseAny>
      </SheetPrimitiveContentAny>
    </SheetPortal>
  )
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className,
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <SheetPrimitiveTitleAny
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <SheetPrimitiveDescriptionAny
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};