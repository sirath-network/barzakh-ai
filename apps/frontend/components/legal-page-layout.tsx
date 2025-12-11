"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useEffect, useState, useRef } from "react";

interface TOCItem {
    title: string;
    id: string;
}

interface LegalPageLayoutProps {
    title: string;
    lastUpdated: string;
    children: React.ReactNode;
    toc?: TOCItem[];
}

export function LegalPageLayout({ title, lastUpdated, children, toc }: LegalPageLayoutProps) {
    const [sidebarOffset, setSidebarOffset] = useState(0);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const footerRef = useRef<HTMLElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!footerRef.current || !sidebarRef.current) return;

            const footerRect = footerRef.current.getBoundingClientRect();
            const sidebarHeight = sidebarRef.current.offsetHeight;
            const sidebarTop = 96; // top-24 = 6rem = 96px
            const buffer = 32; // Extra padding

            // When footer enters viewport and would overlap sidebar
            if (footerRect.top < sidebarTop + sidebarHeight + buffer) {
                const overlap = (sidebarTop + sidebarHeight + buffer) - footerRect.top;
                setSidebarOffset(overlap);
            } else {
                setSidebarOffset(0);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Scroll spy - detect which section is in view
    useEffect(() => {
        if (!toc || toc.length === 0) return;

        const observerOptions = {
            rootMargin: "-100px 0px -60% 0px",
            threshold: 0
        };

        const observerCallback: IntersectionObserverCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        // Observe all section elements
        toc.forEach((item) => {
            const element = document.getElementById(item.id);
            if (element) {
                observer.observe(element);
            }
        });

        // Handle bottom of page - activate last item when scrolled to end
        // But only if user manually scrolled (not after clicking a TOC item)
        const handleScrollEnd = () => {
            // Skip if this scroll was triggered by a manual click
            if (isManualClickRef.current) return;

            const scrolledToBottom =
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;

            if (scrolledToBottom && toc.length > 0) {
                setActiveSection(toc[toc.length - 1].id);
            }
        };

        window.addEventListener("scroll", handleScrollEnd, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", handleScrollEnd);
        };
    }, [toc]);

    // Ref to track if scroll was triggered by clicking TOC
    const isManualClickRef = useRef(false);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        setActiveSection(id);

        // Set flag to prevent scroll-end handler from overriding
        isManualClickRef.current = true;

        // Reset flag after scroll animation completes
        setTimeout(() => {
            isManualClickRef.current = false;
        }, 1000);

        const element = document.getElementById(id);
        if (element) {
            const offset = 100;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

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

                    {/* Fixed Sidebar - Desktop Only */}
                    <aside className="hidden lg:block w-[260px] shrink-0">
                        <div
                            ref={sidebarRef}
                            className="fixed top-24 w-[260px] max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800 transition-transform duration-150"
                            style={{ transform: sidebarOffset > 0 ? `translateY(-${sidebarOffset}px)` : undefined }}
                        >
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight">
                                        {title}
                                    </h1>
                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-wider font-semibold text-neutral-500">Last Updated</p>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">{lastUpdated}</p>
                                    </div>
                                    <div className="h-1 w-12 bg-neutral-900 dark:bg-neutral-100 rounded-full mt-6 opacity-20" />
                                </div>

                                {/* Table of Contents */}
                                {toc && toc.length > 0 && (
                                    <nav className="space-y-1">
                                        <p className="text-xs uppercase tracking-wider font-semibold text-neutral-500 mb-3">Contents</p>
                                        <ul className="space-y-2 border-l border-neutral-200 dark:border-neutral-800 ml-1">
                                            {toc.map((item) => (
                                                <li key={item.id}>
                                                    <a
                                                        href={`#${item.id}`}
                                                        onClick={(e) => scrollToSection(e, item.id)}
                                                        className={`block pl-4 py-1 text-sm -ml-[1px] transition-all truncate ${activeSection === item.id
                                                            ? "text-primary font-medium border-l-2 border-primary"
                                                            : "text-neutral-600 dark:text-neutral-400 hover:text-primary hover:border-l-2 hover:border-primary hover:font-medium"
                                                            }`}
                                                    >
                                                        {item.title}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </nav>
                                )}
                            </div>
                        </div>
                    </aside>

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

            <footer ref={footerRef} className="py-8 mt-20 border-t border-neutral-200/60 dark:border-neutral-800/60">
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
