import React from "react";
import "./px-buttons.css";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean;    // force the sunken state (e.g. held knob)
  selected?: boolean;   // toggled-on (chosen bid, active notch)
  block?: boolean;      // full-width
};

/**
 * Win95-bevel button, recolored by the nearest theme wrapper
 * (.theme-surveillance by default, or .theme-win95).
 * The inner <span> is what shifts 1px on press, so wrap the label.
 */
export function PixelButton({
  pressed,
  selected,
  block,
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  const classes = [
    "px-btn",
    pressed ? "px-btn--pressed" : "",
    selected ? "px-btn--selected" : "",
    block ? "px-btn--block" : "",
    disabled ? "px-btn--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled} {...rest}>
      <span>{children}</span>
    </button>
  );
}
