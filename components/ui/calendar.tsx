"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-4 bg-white rounded-xl", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-6 sm:space-y-0",
                month: "space-y-6",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-semibold text-gray-900",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-gray-100 border-gray-200"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex mb-2",
                head_cell:
                    "text-gray-500 rounded-md w-10 font-medium text-[0.8rem] uppercase tracking-wider",
                row: "flex w-full mt-2",
                cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-emerald-50/50 [&:has([aria-selected])]:bg-emerald-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 hover:text-gray-900 data-[selected]:bg-emerald-600 data-[selected]:text-white"
                ),
                day_range_end: "day-range-end",
                day_selected:
                    "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white shadow-sm",
                day_today: "bg-gray-100 text-gray-900 font-semibold",
                day_outside:
                    "day-outside text-gray-400 opacity-50 aria-selected:bg-emerald-50/50 aria-selected:text-gray-500 aria-selected:opacity-30",
                day_disabled: "text-gray-300 opacity-50",
                day_range_middle:
                    "aria-selected:bg-emerald-50 aria-selected:text-emerald-900",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ ...props }) => {
                    if (props.orientation === 'left') return <ChevronLeft className="h-4 w-4" />
                    if (props.orientation === 'right') return <ChevronRight className="h-4 w-4" />
                    return <ChevronLeft className="h-4 w-4" />
                }
            } as any}

            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
