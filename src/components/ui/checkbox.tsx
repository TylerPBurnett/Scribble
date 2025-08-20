import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({
  className,
  checked,
  onCheckedChange,
  onChange,
  ...props
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={handleChange}
        {...props}
      />
      <div
        className={cn(
          "size-4 shrink-0 rounded-[4px] border border-input bg-background shadow-xs transition-all",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked && "bg-primary border-primary text-primary-foreground",
          className
        )}
        onClick={() => onCheckedChange?.(!checked)}
      >
        {checked && (
          <Check className="size-3 text-current m-0.5" strokeWidth={3} />
        )}
      </div>
    </div>
  )
}

export { Checkbox }