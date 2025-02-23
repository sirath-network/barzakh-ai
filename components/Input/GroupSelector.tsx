import { cn, SearchGroup, SearchGroupId, searchGroups } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ToolbarButton } from "./ToolbarButton";

interface GroupSelectorProps {
  selectedGroup: SearchGroupId;
  onGroupSelect: (group: SearchGroup) => void;
}

export const GroupSelector = ({
  selectedGroup,
  onGroupSelect,
}: GroupSelectorProps) => {
  return (
    <SelectionContent
      selectedGroup={selectedGroup}
      onGroupSelect={onGroupSelect}
    />
  );
};

const SelectionContent = ({ ...props }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        width: isExpanded ? "auto" : "30px",
        gap: isExpanded ? "0.5rem" : 0,
        paddingRight: isExpanded ? "0.5rem" : 0,
      }}
      transition={{
        layout: { duration: 0.4 },
        duration: 0.4,
        ease: [0.4, 0.0, 0.2, 1],
        width: { type: "spring", stiffness: 300, damping: 30 },
        gap: { type: "spring", stiffness: 300, damping: 30 },
        paddingRight: { type: "spring", stiffness: 300, damping: 30 },
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
      className={cn(
        "inline-flex items-center",
        "min-w-[38px]",
        "p-0.5",
        "rounded-full border border-neutral-200 dark:border-neutral-700",
        "bg-white dark:bg-neutral-800",
        "shadow-sm overflow-visible",
        "relative"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <AnimatePresence>
        {searchGroups.map((group, index) => {
          const showItem = isExpanded || props.selectedGroup === group.id;
          return (
            <motion.div
              key={group.id}
              animate={{
                width: showItem ? "28px" : 0,
                opacity: showItem ? 1 : 0,
                x: showItem ? 0 : -10,
              }}
              exit={{ opacity: 1, x: 0, transition: { duration: 0 } }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                delay: index * 0.05,
                opacity: { duration: 0.2, delay: showItem ? index * 0.05 : 0 },
              }}
              style={{ margin: 0 }}
            >
              <ToolbarButton
                group={group}
                isSelected={props.selectedGroup === group.id}
                onClick={() => {
                  props.onGroupSelect(group);
                  console.log();
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};
