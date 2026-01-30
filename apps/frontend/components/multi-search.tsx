// /components/multi-search.tsx
/* eslint-disable @next/next/no-img-element */
import React from "react";
import { motion } from "@/lib/framer-motion";
import {
  Globe,
  Search,
  ExternalLink,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TweetCard } from "./tweet-card";

const GlobeAny = Globe as any;
const SearchAny = Search as any;
const ExternalLinkAny = ExternalLink as any;
const CalendarAny = Calendar as any;
const XAny = X as any;
const ChevronLeftAny = ChevronLeft as any;
const ChevronRightAny = ChevronRight as any;
const DrawerContentAny = DrawerContent as any;

type SearchImage = {
  url: string;
  description: string;
};

type SearchResult = {
  url: string;
  title: string;
  content: string;
  raw_content: string;
  published_date?: string;
};

type SearchQueryResult = {
  query: string;
  results: SearchResult[];
  images: SearchImage[];
};

type MultiSearchResponse = {
  web: SearchQueryResult[];
  x: any; // Define a proper type for x results if available
};

type MultiSearchArgs = {
  queries: string[];
};

const PREVIEW_IMAGE_COUNT = 2;

// Loading state component
const SearchLoadingState = ({
  queries,
  previewCount,
}: {
  queries: string[];
  previewCount: number;
}) => (
  <div className="w-full space-y-4">
    <Accordion
      type="single"
      collapsible
      defaultValue="search"
      className="w-full"
    >
      <AccordionItem value="search" className="border-none">
        <AccordionTrigger className="p-0 hover:no-underline data-[state=closed]:border-b data-[state=closed]:border-neutral-200 data-[state=closed]:dark:border-neutral-700 data-[state=closed]:pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/40">
              <GlobeAny className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-left">Running Web Search</h2>
                <span className="flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce" />
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className="animate-pulse">
                  Searching...
                </Badge>
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="mt-4 pt-0 border-0">
          <div className="flex overflow-x-auto custom-scrollbar gap-2 mb-3 no-scrollbar pb-1">
            {queries.map((query, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground flex-shrink-0 border border-border/50"
              >
                <SearchAny className="h-3 w-3 mr-1.5" />
                {query}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[...Array(previewCount)].map((_, i) => (
              <div
                key={i}
                className="w-full bg-card rounded-xl border border-border/50 shadow-sm"
              >
                <div className="p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-muted/40" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-3/4 bg-muted/40 rounded" />
                      <div className="h-3 w-1/2 bg-muted/40 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-muted/40 rounded" />
                    <div className="h-3 w-full bg-muted/40 rounded" />
                    <div className="h-3 w-2/3 bg-muted/40 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

// ResultCard component
const ResultCard = ({ result }: { result: SearchResult }) => (
  <div className="w-full h-full bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all flex flex-col group">
    <div className="p-4 flex-grow">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img
            src={`https://www.google.com/s2/favicons?sz=128&domain=${new URL(result.url).hostname
              }`}
            alt={`${new URL(result.url).hostname} favicon`}
            className="w-6 h-6 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <div className="min-w-0">
          <h3 className="font-medium text-sm truncate text-foreground">{result.title}</h3>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <span className="truncate">{new URL(result.url).hostname}</span>
            <ExternalLinkAny className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3 break-words">
        {result.content}
      </p>
    </div>
    {result.published_date && (
      <div className="p-4 pt-3 border-t border-border/50">
        <time className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CalendarAny className="h-3 w-3" />
          {new Date(result.published_date).toLocaleDateString()}
        </time>
      </div>
    )}
  </div>
);

// ImageGrid and ImageViewer component
const ImageGrid = ({ images }: { images: SearchImage[] }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState(0);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const displayImages = images.slice(0, PREVIEW_IMAGE_COUNT);
  const hasMore = images.length > PREVIEW_IMAGE_COUNT;

  const handleImageClick = (index: number) => {
    setSelectedImage(index);
    setIsOpen(true);
  };

  const ImageViewer = () => (
    <div className="relative w-full h-full">
      <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
        <span className="px-2 py-1 rounded-md bg-black/20 backdrop-blur-sm text-xs text-white">
          {selectedImage + 1} / {images.length}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40" onClick={() => setIsOpen(false)}>
          <XAny className="h-4 w-4" />
        </Button>
      </div>
      <img src={images[selectedImage].url} alt={images[selectedImage].description} className="w-full h-full object-contain" />
      <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40" onClick={() => setSelectedImage((p) => (p === 0 ? images.length - 1 : p - 1))}>
        <ChevronLeftAny className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40" onClick={() => setSelectedImage((p) => (p === images.length - 1 ? 0 : p + 1))}>
        <ChevronRightAny className="h-4 w-4" />
      </Button>
      {images[selectedImage].description && (
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-sm text-white">{images[selectedImage].description}</p>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {displayImages.map((image, index) => (
          <motion.button
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden group hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all"
            onClick={() => handleImageClick(index)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <img src={image.url} alt={image.description} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
              <p className="text-xs text-white line-clamp-2">{image.description}</p>
            </div>
            {index === PREVIEW_IMAGE_COUNT - 1 && hasMore && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-xl font-medium text-white">+{images.length - PREVIEW_IMAGE_COUNT}</span>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {isDesktop ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-4xl h-[80vh] p-0 bg-transparent border-none shadow-none">
            <ImageViewer />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContentAny className="h-[85vh] p-0 border-none">
            <ImageViewer />
          </DrawerContentAny>
        </Drawer>
      )}
    </div>
  );
};

// Main MultiSearch component
const MultiSearch: React.FC<{
  result: MultiSearchResponse | null;
  args: MultiSearchArgs;
}> = ({ result, args }) => {
  const [showAll, setShowAll] = React.useState(false);
  const [showAllTweets, setShowAllTweets] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const isDesktopQuery = useMediaQuery("(min-width: 768px)");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const xContainerRef = React.useRef<HTMLDivElement>(null);

  // Handle hydration - use consistent value during SSR and initial render
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use desktop count (3) as default during SSR to prevent layout shift
  // This works because the grid CSS already handles responsive behavior
  const isDesktop = isMounted ? isDesktopQuery : true;
  const PREVIEW_RESULT_COUNT = isDesktop ? 3 : 2;

  // Track if results are pre-loaded (result is available on first render)
  const isPreloadedRef = React.useRef<boolean | null>(null);
  if (isPreloadedRef.current === null) {
    isPreloadedRef.current = result !== null;
  }
  const isPreloaded = isPreloadedRef.current;

  if (!result) {
    return (
      <SearchLoadingState
        queries={args.queries}
        previewCount={PREVIEW_RESULT_COUNT}
      />
    );
  }

  const allImages = result.web.reduce<SearchImage[]>((acc, search) => [...acc, ...search.images], []);
  const allResults = result.web.flatMap(search => search.results);

  const allTweets = result.x?.flatMap((search: any) => {
    if (search?.error) {
      console.warn("X Search Error:", search.error);
      return [];
    }
    return search.tweets || [];
  }) || [];

  const displayResults = showAll ? allResults : allResults.slice(0, PREVIEW_RESULT_COUNT);
  const hasMoreResults = allResults.length > PREVIEW_RESULT_COUNT;

  const displayTweets = showAllTweets ? allTweets : allTweets.slice(0, PREVIEW_RESULT_COUNT);
  const hasMoreTweets = allTweets.length > PREVIEW_RESULT_COUNT;

  const xSearchFailed = result.x?.every((search: any) => search?.error) || false;

  const handleToggleShowAll = () => {
    if (showAll) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowAll(!showAll);
  };

  const handleToggleShowAllTweets = () => {
    if (showAllTweets) {
      xContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowAllTweets(!showAllTweets);
  };

  return (
    <div ref={containerRef} className="w-full space-y-4 pr-1.5 scroll-mt-20">
      <Accordion type="single" collapsible defaultValue="search" className="w-full">
        <AccordionItem value="search" className="border-none">
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:mb-2 data-[state=closed]:mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/40">
                <GlobeAny className="h-4 w-4 text-muted-foreground" />
              </div>
              <h2 className="font-medium text-left">Web Search Results</h2>
            </div>
          </AccordionTrigger>

          <AccordionContent className="mt-4 pt-0 border-0">
            <div className="flex overflow-x-auto gap-2 mb-4 no-scrollbar pb-1">
              {result.web.map((search, i) => (
                <Badge key={i} variant="secondary" className="px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground flex-shrink-0 border border-border/50">
                  <SearchAny className="h-3 w-3 mr-1.5" />
                  {search.query}
                </Badge>
              ))}
            </div>

            <div
              className={`grid gap-3 ${allResults.length === 1
                ? 'grid-cols-1'
                : 'grid-cols-2 md:grid-cols-3'
                }`}
            >
              {displayResults.map((res, index) => (
                <motion.div
                  key={`${res.url}-${index}`}
                  initial={isPreloaded ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : index * 0.05 }}
                  className="h-full"
                >
                  <ResultCard result={res} />
                </motion.div>
              ))}
            </div>

            {hasMoreResults && (
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
                </div>
                <div className="relative flex justify-center">
                  <button
                    type="button"
                    onClick={handleToggleShowAll}
                    className="px-4 py-1.5 text-sm font-sm rounded-full bg-card border border-border/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all shadow-sm"
                  >
                    {showAll ? "Show Less" : "Show More"}
                  </button>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {(allTweets.length > 0 || xSearchFailed) && (
        <div ref={xContainerRef} className="w-full space-y-4 pr-1.5 scroll-mt-20">
          <Accordion type="single" collapsible defaultValue="x-search" className="w-full">
            <AccordionItem value="x-search" className="border-none">
              <AccordionTrigger className="p-0 hover:no-underline data-[state=closed]:border-b data-[state=closed]:border-neutral-200 data-[state=closed]:dark:border-neutral-700 data-[state=closed]:pb-4 data-[state=closed]:mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" className="h-4 w-4 text-neutral-500">
                      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
                    </svg>
                  </div>
                  <h2 className="font-medium text-left">
                    X Results {xSearchFailed && "(Limited due to rate limits)"}
                  </h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0 border-0">
                {xSearchFailed && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      X (Twitter) search is currently rate limited. Showing web results only.
                    </p>
                  </div>
                )}

                {allTweets.length > 0 && (
                  <div className={`grid gap-3 pt-4 ${allTweets.length === 1
                    ? 'grid-cols-1'
                    : 'grid-cols-2 md:grid-cols-3'
                    }`}
                  >
                    {displayTweets.map((tweet: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={isPreloaded ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : index * 0.05 }}
                        className="h-full"
                      >
                        <TweetCard tweet={tweet} />
                      </motion.div>
                    ))}
                  </div>
                )}
                {hasMoreTweets && (
                  <div className="relative mt-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
                    </div>
                    <div className="relative flex justify-center">
                      <button
                        type="button"
                        onClick={handleToggleShowAllTweets}
                        className="px-4 py-1.5 text-sm font-sm rounded-full bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-neutral-900 transition-all"
                      >
                        {showAllTweets ? "Show Less" : "Show More"}
                      </button>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {allImages.length > 0 && <ImageGrid images={allImages} />}
    </div>
  );
};

export default MultiSearch;