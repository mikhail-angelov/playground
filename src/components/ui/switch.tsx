"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, checked, onCheckedChange, label, ...props }, ref) => {
        return (
            <label className="flex items-center cursor-pointer group">
                <div className="relative">
                    <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={(e) => onCheckedChange(e.target.checked)}
                        ref={ref}
                        {...props}
                    />
                    <div
                        className={cn(
                            "block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out",
                            checked ? "bg-blue-600" : "bg-zinc-700 group-hover:bg-zinc-600"
                        )}
                    ></div>
                    <div
                        className={cn(
                            "absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out",
                            checked ? "translate-x-4" : "translate-x-0"
                        )}
                    ></div>
                </div>
                {label && (
                    <span className="ml-3 text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                        {label}
                    </span>
                )}
            </label>
        );
    }
);

Switch.displayName = "Switch";

export { Switch };
