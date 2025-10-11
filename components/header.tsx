"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Leaf, RefreshCw } from "lucide-react"

interface DashboardHeaderProps {
    onRefresh?: () => void
}

function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo and Title */}
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-gray-900">
                            <div className="flex items-center justify-center w-10 h-10 bg-emerald-600 rounded-lg shadow-sm">
                                <Leaf className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-gray-900">Planti Dashboard</span>
                        </Link>
                        <div className="hidden md:flex items-center gap-4">
                            <div className="w-px h-5 bg-gray-300" />
                            <span className="text-sm font-medium text-gray-600">Gestion des Commandes</span>
                        </div>
                    </div>


                </div>
            </div>
        </header>
    )
}

export { DashboardHeader }