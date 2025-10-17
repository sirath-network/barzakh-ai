'use client';

import { useFormStatus } from 'react-dom';
import { signOut } from '@/app/(auth)/auth';

function SignOutUI() {
  const { pending } = useFormStatus();

  return (
    <>
      {/* */}
      <button
        type="submit"
        disabled={pending}
        className="w-full text-left px-1 py-0.5 text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Sign out
      </button>

      {/* */}
      {pending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg font-semibold text-foreground">
            Signing Out...
          </p>
        </div>
      )}
    </>
  );
}

export const SignOutForm = () => {
  return (
    <form
      className="w-full"
      action={async () => {
        'use server';
        await signOut({
          redirectTo: '/',
        });
      }}
    >
      <SignOutUI />
    </form>
  );
};