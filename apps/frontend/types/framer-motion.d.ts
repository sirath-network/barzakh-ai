import "framer-motion";

// Type augmentation for framer-motion to fix HTML attribute issues in v11
declare module "framer-motion" {
  export interface MotionProps {
    className?: string;
    style?: React.CSSProperties;
    id?: string;
    onClick?: React.MouseEventHandler;
    onMouseEnter?: React.MouseEventHandler;
    onMouseLeave?: React.MouseEventHandler;
    onFocus?: React.FocusEventHandler;
    onBlur?: React.FocusEventHandler;
    type?: string;
    disabled?: boolean;
    children?: React.ReactNode;
    href?: string;
    target?: string;
    rel?: string;
    tabIndex?: number;
    role?: string;
    "aria-label"?: string;
    "aria-hidden"?: boolean;
    "aria-expanded"?: boolean;
    "aria-controls"?: string;
    "data-testid"?: string;
  }
}
