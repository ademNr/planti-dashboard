"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Leaf, BarChart3, ShoppingCart } from "lucide-react"

interface DashboardHeaderProps {
    activeTab?: "analytics" | "orders"
    onTabChange?: (tab: "analytics" | "orders") => void
    onRefresh?: () => void
}

function DashboardHeader({ activeTab = "analytics", onTabChange, onRefresh }: DashboardHeaderProps) {
    const handleTabClick = (tab: "analytics" | "orders") => {
        if (onTabChange) {
            onTabChange(tab)
        }
        // Scroll to the corresponding section
        setTimeout(() => {
            const sectionId = tab === "analytics" ? "analytics-section" : "orders-section"
            const section = document.getElementById(sectionId)
            if (section) {
                const headerHeight = 64 // Height of sticky header
                const sectionPosition = section.offsetTop - headerHeight - 20 // 20px padding
                window.scrollTo({
                    top: sectionPosition,
                    behavior: 'smooth'
                })
            } else {
                // Fallback: scroll to content area
                const contentArea = document.querySelector('[data-content-area]')
                if (contentArea) {
                    contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }
        }, 150)
    }

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="px-3 sm:px-4 md:px-6 lg:px-8 max-w-[1600px] mx-auto">
                <div className="flex h-14 md:h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2 md:gap-3">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-lg shadow-sm">
                                <Leaf className="h-5 w-5 md:h-6 md:w-6 text-white" />
                            </div>
                            <span className="hidden sm:inline text-base md:text-xl font-bold text-gray-900">Planti</span>
                        </Link>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 md:gap-2 flex-1 justify-center max-w-md mx-4">
                        <button
                            onClick={() => handleTabClick("analytics")}
                            className={`flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
                                activeTab === "analytics"
                                    ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            }`}
                        >
                            <div className="flex items-center justify-center gap-1.5 md:gap-2">
                                <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">Analyses</span>
                                <span className="sm:hidden">Analyses</span>
                            </div>
                        </button>
                        <button
                            onClick={() => handleTabClick("orders")}
                            className={`flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
                                activeTab === "orders"
                                    ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            }`}
                        >
                            <div className="flex items-center justify-center gap-1.5 md:gap-2">
                                <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">Commandes</span>
                                <span className="sm:hidden">Commandes</span>
                            </div>
                        </button>
                    </div>

                    {/* Right side - can add actions here if needed */}
                    <div className="w-8 md:w-10"></div>
                </div>
            </div>
        </header>
    )
}

export { DashboardHeader }