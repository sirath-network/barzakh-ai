// /components/multi-search.tsx
/* eslint-disable @next/next/no-img-element */
import React from "react";
import { motion } from "framer-motion";
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
  searches: SearchQueryResult[];
};

type MultiSearchArgs = {
  queries: string[];
};

const PREVIEW_IMAGE_COUNT = 4;

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
        <AccordionTrigger className="p-0 hover:no-underline">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <Globe className="h-4 w-4 text-neutral-500" />
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
                className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex-shrink-0"
              >
                <Search className="h-3 w-3 mr-1.5" />
                {query}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[...Array(previewCount)].map((_, i) => (
              <div
                key={i}
                className="w-full bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm"
              >
                <div className="p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-3/4 bg-neutral-100 dark:bg-neutral-800 rounded" />
                      <div className="h-3 w-1/2 bg-neutral-100 dark:bg-neutral-800 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded" />
                    <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded" />
                    <div className="h-3 w-2/3 bg-neutral-100 dark:bg-neutral-800 rounded" />
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
  <div className="w-full h-full bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all flex flex-col">
    <div className="p-4 flex-grow">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img
            src={`https://www.google.com/s2/favicons?sz=128&domain=${
              new URL(result.url).hostname
            }`}
            alt={`${new URL(result.url).hostname} favicon`}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <div className="min-w-0">
          <h3 className="font-medium text-sm truncate">{result.title}</h3>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1"
          >
            <span className="truncate">{new URL(result.url).hostname}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3 break-words">
        {result.content}
      </p>
    </div>
    {result.published_date && (
      <div className="p-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <time className="text-xs text-neutral-500 flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
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
          <X className="h-4 w-4" />
        </Button>
      </div>
      <img src={images[selectedImage].url} alt={images[selectedImage].description} className="w-full h-full object-contain" />
      <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40" onClick={() => setSelectedImage((p) => (p === 0 ? images.length - 1 : p - 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40" onClick={() => setSelectedImage((p) => (p === images.length - 1 ? 0 : p + 1))}>
        <ChevronRight className="h-4 w-4" />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <DrawerContent className="h-[85vh] p-0 border-none">
            <ImageViewer />
          </DrawerContent>
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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const PREVIEW_RESULT_COUNT = isDesktop ? 3 : 2;

  if (!result) {
    return (
      <SearchLoadingState
        queries={args.queries}
        previewCount={PREVIEW_RESULT_COUNT}
      />
    );
  }

  const allImages = result.searches.reduce<SearchImage[]>((acc, search) => [...acc, ...search.images], []);
  const allResults = result.searches.flatMap(search => search.results);
  
  const displayResults = showAll ? allResults : allResults.slice(0, PREVIEW_RESULT_COUNT);
  const hasMoreResults = allResults.length > PREVIEW_RESULT_COUNT;

  const handleToggleShowAll = () => {
    if (showAll) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowAll(!showAll);
  };

  return (
    <div ref={containerRef} className="w-full space-y-4 scroll-mt-20">
      <Accordion type="single" collapsible defaultValue="search" className="w-full">
        <AccordionItem value="search" className="border-none">
          <AccordionTrigger className="p-0 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                <Globe className="h-4 w-4 text-neutral-500" />
              </div>
              <h2 className="font-medium text-left">Web Search Results</h2>
            </div>
          </AccordionTrigger>

          <AccordionContent className="mt-4 pt-0 border-0">
            <div className="flex overflow-x-auto gap-2 mb-4 no-scrollbar pb-1">
              {result.searches.map((search, i) => (
                <Badge key={i} variant="secondary" className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                  <Search className="h-3 w-3 mr-1.5" />
                  {search.query}
                </Badge>
              ))}
            </div>
            
            {/* PERUBAHAN DI SINI: Kelas grid sekarang dinamis */}
            <div 
              className={`grid gap-3 ${
                allResults.length === 1
                  ? 'grid-cols-1' // Jika hanya 1 hasil, gunakan 1 kolom
                  : 'grid-cols-2 md:grid-cols-3' // Jika lebih, gunakan 2 atau 3 kolom
              }`}
            >
              {displayResults.map((res, index) => (
                <motion.div
                  key={`${res.url}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
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
                    className="px-4 py-1.5 text-sm font-sm rounded-full bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-neutral-900 transition-all"
                  >
                    {showAll ? "Show Less" : "Show More"}
                  </button>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {allImages.length > 0 && <ImageGrid images={allImages} />}
    </div>
  );
};

export default MultiSearch;