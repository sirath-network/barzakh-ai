"use client";

import { useEffect, useState, useRef } from "react";

interface TOCItem {
    title: string;
    id: string;
}

interface LegalPageSidebarProps {
    title: string;
    lastUpdated: string;
    toc?: TOCItem[];
}

export function LegalPageSidebar({ title, lastUpdated, toc }: LegalPageSidebarProps) {
    const [sidebarOffset, setSidebarOffset] = useState(0);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const footer = document.getElementById("legal-footer");
            if (!footer || !sidebarRef.current) return;

            const footerRect = footer.getBoundingClientRect();
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
    );
}
