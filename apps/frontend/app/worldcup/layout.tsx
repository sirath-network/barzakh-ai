import { ReactNode } from "react";

export const experimental_ppr = true;

export default function WorldCupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
