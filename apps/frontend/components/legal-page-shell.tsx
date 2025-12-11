import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LegalPageSidebar } from "./legal-page-sidebar";

interface TOCItem {
    title: string;
    id: string;
}

interface LegalPageShellProps {
    title: string;
    lastUpdated: string;
    children: React.ReactNode;
    toc?: TOCItem[];
}

export function LegalPageShell({ title, lastUpdated, children, toc }: LegalPageShellProps) {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800 relative">
            {/* Dot pattern background */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                style={{
                    backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
                    backgroundSize: "24px 24px"
                }}
            />

            {/* Navbar / Header */}
            <header className="sticky top-0 z-50 w-full border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md">
                <div className="container max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link
                        href="/"
                        className="group flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                    >
                        <div className="p-1 rounded-full group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800 transition-colors">
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        </div>
                        Back to Chat
                    </Link>
                    <div className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                        Barzakh AI
                    </div>
                </div>
            </header>

            <div className="container max-w-5xl mx-auto px-6 md:px-8 relative">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">

                    {/* Sidebar - Client Component */}
                    <LegalPageSidebar title={title} lastUpdated={lastUpdated} toc={toc} />

                    {/* Main Content */}
                    <main className="flex-1 py-12">
                        {/* Mobile Title - Only visible on mobile */}
                        <div className="lg:hidden mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight mb-2">
                                {title}
                            </h1>
                            <p className="text-xs text-neutral-500">
                                Last updated: {lastUpdated}
                            </p>
                        </div>

                        <article
                            className="prose prose-neutral dark:prose-invert max-w-none
                prose-headings:font-semibold prose-headings:tracking-tight
                prose-h2:text-xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:scroll-mt-32
                prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-p:leading-relaxed
                prose-li:text-neutral-600 dark:prose-li:text-neutral-400
                prose-strong:text-neutral-900 dark:prose-strong:text-neutral-200
                prose-a:text-neutral-900 dark:prose-a:text-neutral-100 prose-a:underline prose-a:decoration-neutral-300 dark:prose-a:decoration-neutral-700 prose-a:underline-offset-2 hover:prose-a:decoration-neutral-600 dark:hover:prose-a:decoration-neutral-400 transition-colors
                prose-blockquote:border-l-2 prose-blockquote:border-neutral-200 dark:prose-blockquote:border-neutral-800 prose-blockquote:pl-6 prose-blockquote:italic
              "
                        >
                            {children}
                        </article>
                    </main>
                </div>
            </div>

            <footer id="legal-footer" className="py-8 mt-20 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <div className="container max-w-5xl mx-auto px-6 flex justify-between items-center text-xs text-neutral-500">
                    <span>&copy; {new Date().getFullYear()} Barzakh AI</span>
                    <div className="flex gap-4">
                        <Link href="/privacy-policy" className="hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors">Privacy Policy</Link>
                        <Link href="/terms-of-service" className="hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
