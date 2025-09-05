import { useCallback } from "react";

export default function TextSizeControls({
    value,
    onChange,
    min = 0.85,
    max = 1.5,
    step = 0.05,
}) {
    const clamp = useCallback(
        (n) => Math.min(max, Math.max(min, parseFloat(n.toFixed(2)))),
        [min, max]
    );

    const dec = () => onChange(clamp(value - step));
    const inc = () => onChange(clamp(value + step));
    const reset = () => onChange(1);

    return (
        <div
            className="inline-flex items-center gap-1 rounded-md border theme-border-primary
                 bg-white dark:bg-gray-800 px-1 py-1"
            aria-label="Text size controls"
        >
            <button
                type="button"
                onClick={dec}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Decrease text size"
            >
                –
            </button>
            <span className="px-2 text-xs tabular-nums text-gray-600 dark:text-gray-300" aria-live="polite">
                {Math.round(value * 100)}%
            </span>
            <button
                type="button"
                onClick={inc}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Increase text size"
            >
                +
            </button>
            <button
                type="button"
                onClick={reset}
                className="ml-1 px-2 py-1 text-xs rounded border theme-border-primary
                   hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Reset text size"
                title="Reset"
            >
                A
            </button>
        </div>
    );
}
