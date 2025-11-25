"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@barzakh/shared/lib/utils/utils"

const DrawerPrimitiveRootAny = DrawerPrimitive.Root as any;
const DrawerPrimitiveTriggerAny = DrawerPrimitive.Trigger as any;
const DrawerPrimitivePortalAny = DrawerPrimitive.Portal as any;
const DrawerPrimitiveCloseAny = DrawerPrimitive.Close as any;
const DrawerPrimitiveOverlayAny = DrawerPrimitive.Overlay as any;
const DrawerPrimitiveContentAny = DrawerPrimitive.Content as any;
const DrawerPrimitiveTitleAny = DrawerPrimitive.Title as any;
const DrawerPrimitiveDescriptionAny = DrawerPrimitive.Description as any;

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitiveRootAny
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitiveTriggerAny

const DrawerPortal = DrawerPrimitivePortalAny

const DrawerClose = DrawerPrimitiveCloseAny

const DrawerOverlay = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <DrawerPrimitiveOverlayAny
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitiveContentAny
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitiveContentAny>
  </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <DrawerPrimitiveTitleAny
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<any>,
  React.ComponentPropsWithoutRef<any>
>(({ className, ...props }, ref) => (
  <DrawerPrimitiveDescriptionAny
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
