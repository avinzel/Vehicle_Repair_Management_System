"use client"

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Same look and behaviour as the part picker in PartsLogger (Popover + Command),
// with one addition: a value that is not in the list can still be used.
//
// - Click the field, search, pick an option.
// - Nothing matches (or there is no list at all, e.g. a brand we don't know):
//   a "Use “text”" row appears, so manual entry always works, online or not.
// - `onChange` receives the chosen / typed string.
export function ComboboxInput({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  searchPlaceholder = "Search or type...",
  disabled,
  readOnly,
  className = "",
  maxResults = 50,
  "aria-invalid": ariaInvalid,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const current = (value ?? "").trim();
  const query = search.trim().toLowerCase();
  const exact = options.some((o) => o.toLowerCase() === query);

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, maxResults);
    const matches = options.filter((o) => o.toLowerCase().includes(query));
    // Prefix matches first, then the rest (sort is stable).
    matches.sort(
      (a, b) =>
        Number(b.toLowerCase().startsWith(query)) - Number(a.toLowerCase().startsWith(query))
    );
    return matches.slice(0, maxResults);
  }, [options, query, maxResults]);

  const showCustom = !!query && !exact;
  const locked = disabled || readOnly;

  function choose(next) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Popover
      open={open && !locked}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSearch(""); // fresh search every time it opens
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={locked}
          className={`w-full justify-between font-normal bg-background disabled:opacity-100 ${className}`}
        >
          <span className={`truncate ${current ? "" : "text-muted-foreground"}`}>
            {current || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {/* Filtering is done above so prefix matches rank first and the
            custom-value row can be added; cmdk just renders the list. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !showCustom && (
              <CommandEmpty>
                {options.length === 0 ? "Type to enter a value." : "No match."}
              </CommandEmpty>
            )}

            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => choose(option)}>
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      option.toLowerCase() === current.toLowerCase() ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {option}
                </CommandItem>
              ))}

              {showCustom && (
                <CommandItem value="__use-typed__" onSelect={() => choose(search.trim())}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="truncate">Use “{search.trim()}”</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}