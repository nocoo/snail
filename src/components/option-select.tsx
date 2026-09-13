import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nocoo/basalt/components/select";
import type { ComponentProps } from "react";

// Basalt's composite Select reserves an empty string for its placeholder.
const empty = "__snail_empty__";

export function OptionSelect({
  value,
  onValueChange,
  options,
  ...trigger
}: Omit<ComponentProps<typeof SelectTrigger>, "value" | "onChange" | "children"> & {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      value={value || empty}
      onValueChange={(next) => onValueChange(next === empty ? "" : next)}
    >
      <SelectTrigger {...trigger}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[var(--radix-select-content-available-height)]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value || empty}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
