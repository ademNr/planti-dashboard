
// app/dashboard/page.tsx
"use client"

import { useState, useEffect, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { DateRange } from "react-day-picker"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Package, DollarSign, ShoppingCart, Search,
    Eye, Truck, CheckCircle, Clock, XCircle, RefreshCw,
    BarChart3, MapPin, Phone, TrendingUp, User, CreditCard, FileText, Gift, Leaf,
    Users, Repeat, Calendar as CalendarIcon, Activity, Target, Undo2
} from "lucide-react"
import { DashboardHeader } from "@/components/header"
import Link from "next/link"
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from 'recharts'

interface OrderProduct {
    productId: string
    name: string
    price: number
    quantity: number
    subtotal: number
    image: string
}

interface Order {
    _id: string
    orderNumber: string
    customer: {
        fullName: string
        phone: string
        email: string
        city: string
        postalCode: string
        address: string
    }
    products: OrderProduct[]
    orderSummary: {
        productsTotal: number
        deliveryFee: number
        totalPrice: number
        totalItems: number
        profit?: number
        freeProductQuantity?: number
    }
    status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
    orderDate: string
    paymentMethod?: string
    deliveryInfo: {
        city: string
        address: string
        estimatedDelivery: string
    }
    emailSent: boolean
    note?: string
    createdAt: string
    updatedAt: string
}

interface DashboardStats {
    totalOrders: number
    totalRevenue: number
    totalProfit?: number
    totalFreeProducts?: number
    pendingOrders: number
    confirmedOrders: number
    preparingOrders: number
    shippedOrders: number
    deliveredOrders: number
    cancelledOrders: number
    avgOrderValue: number
    avgProfitPerOrder?: number
    todayOrders: number
    todayRevenue: number
    todayProfit?: number
    yesterdayRevenue?: number
    yesterdayProfit?: number
    daysBeforeRevenue?: number
    daysBeforeProfit?: number
    filteredOrdersCount?: number
    ordersByStatus: {
        [key: string]: number
    }
    revenueByStatus: {
        [key: string]: number
    }
    profitByStatus?: {
        [key: string]: number
    }
    ordersByCity: { _id: string; count: number; revenue: number; profit?: number }[]
    topProducts: { _id: string; totalQuantity: number; totalRevenue: number; totalProfit?: number; orderCount: number }[]
    recentOrders: Order[]
    ordersOverTime: { _id: string; count: number; revenue: number; profit?: number }[]
    soldCansByStatus?: {
        all: number
        pending: number
        confirmed: number
        preparing: number
        shipped: number
        delivered: number
    }
    cansByPlantType?: { name: string; count: number }[]
    allPlantTypes?: string[]
    soldCansForSelectedPlantType?: number
    ordersByHour?: { hour: number; hourLabel: string; count: number }[]
    ordersByDayOfWeek?: { day: string; dayIndex: number; count: number; revenue: number }[]
    uniqueCustomersCount?: number
    repeatCustomersCount?: number
    avgOrdersPerCustomer?: number
    conversionRate?: number
    avgItemsPerOrder?: number
    avgDailyRevenue?: number
    avgDailyProfit?: number
    avgWeeklyRevenue?: number
    avgWeeklyProfit?: number
    avgMonthlyRevenue?: number
    avgMonthlyProfit?: number
    returnsCount?: number
}

interface ReturnData {
    _id: string
    createdAt: string
    cost: number
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#6366f1']

const orderSchema = z.object({
    customer: z.object({
        fullName: z.string().min(1, "Nom complet requis"),
        phone: z.string().min(1, "Téléphone requis"),
        email: z.string().email("Email invalide").min(1, "Email requis"),
        city: z.string().min(1, "Ville requise"),
        postalCode: z.string().optional(),
        address: z.string().min(1, "Adresse requise"),
    }),
    products: z.array(z.object({
        name: z.string().min(1, "Nom du produit requis"),
        price: z.number().min(0, "Prix doit être positif").refine(val => !isNaN(val), "Prix invalide"),
        quantity: z.number().min(1, "Quantité doit être au moins 1").refine(val => !isNaN(val), "Quantité invalide"),
        image: z.string().optional(),
    })).min(1, "Au moins un produit requis"),
    paymentMethod: z.string().default("cash_on_delivery"),
})

type OrderForm = z.infer<typeof orderSchema>

export default function DashboardPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [cityFilter, setCityFilter] = useState("")
    const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "days_before" | "custom">("all")
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [cansStatusFilter, setCansStatusFilter] = useState<"all" | "pending" | "confirmed" | "preparing" | "shipped" | "delivered">("all")
    const [plantTypeFilter, setPlantTypeFilter] = useState<string>("all")
    const [averagesStatusFilter, setAveragesStatusFilter] = useState<"all" | "pending" | "confirmed" | "preparing" | "shipped" | "delivered">("all")
    const [activeTab, setActiveTab] = useState<"analytics" | "orders">("analytics")
    const [isAddOrderOpen, setIsAddOrderOpen] = useState(false)
    const [addingOrder, setAddingOrder] = useState(false)
    const [returns, setReturns] = useState<ReturnData[]>([])
    const [addingReturn, setAddingReturn] = useState(false)

    const form = useForm<OrderForm>({
        resolver: zodResolver(orderSchema) as any,
        defaultValues: {
            customer: {
                fullName: "",
                phone: "",
                email: "",
                city: "",
                postalCode: "",
                address: "",
            },
            products: [{ name: "", price: 0, quantity: 1, image: "" }],
            paymentMethod: "cash_on_delivery",
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "products"
    })

    useEffect(() => {
        fetchOrders()
        fetchStats()
        fetchReturns()
    }, [])

    const fetchReturns = async () => {
        try {
            const response = await fetch('/api/returns')
            const data = await response.json()
            if (data.success) {
                setReturns(data.data)
            }
        } catch (error) {
            console.error("Error fetching returns:", error)
        }
    }

    const addReturn = async () => {
        if (!confirm("Confirmer l'ajout d'un retour (Coût: 3 TND) ?")) return

        setAddingReturn(true)
        try {
            const response = await fetch('/api/returns', {
                method: 'POST',
            })
            if (response.ok) {
                fetchReturns()
            }
        } catch (error) {
            console.error("Error adding return:", error)
        } finally {
            setAddingReturn(false)
        }
    }

    const fetchOrders = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders?limit=10000`)
            const data = await response.json()
            setOrders(data.orders || [])
        } catch (error) {
            console.error("Error fetching orders:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/stats/dashboard`)
            const data = await response.json()
            setStats(data)
        } catch (error) {
            console.error("Error fetching stats:", error)
        }
    }

    // Calculate profit and free products based on order data
    const adjustedStats = useMemo(() => {
        if (!stats || !orders.length) return stats

        const DELIVERY_FEE = 8 // Shipping cost in TND
        const PRODUCT_COST = 6 // Cost per product unit in TND
        const FREE_PRODUCT_COST = 6 // Cost of free product given for orders with 3+ products

        // Calculate revenue: totalPrice - 8 TND (shipping cost)
        const calculateRevenue = (orderList: Order[]) => {
            return orderList.reduce((sum, order) => {
                if (order.status === 'cancelled') return sum
                // Revenue = totalPrice - shipping cost (8 TND)
                const revenue = order.orderSummary.totalPrice - DELIVERY_FEE
                return sum + Math.max(0, revenue) // Ensure revenue is not negative
            }, 0)
        }

        // Calculate profit: Revenue - (product costs) - (1% of revenue) - (free product cost if 3+ products)
        const calculateProfit = (orderList: Order[]) => {
            return orderList.reduce((sum, order) => {
                if (order.status === 'cancelled') return sum

                // Step 1: Calculate revenue (totalPrice - shipping)
                const revenue = order.orderSummary.totalPrice - DELIVERY_FEE

                // Step 2: Calculate product costs (6 TND per product unit)
                const numberOfProducts = order.orderSummary.totalItems
                const productCosts = numberOfProducts * PRODUCT_COST

                // Step 3: Calculate free product cost (6 TND if 3+ products)
                const freeProductCost = numberOfProducts >= 3 ? FREE_PRODUCT_COST : 0

                // Step 4: Calculate 3% deduction from revenue
                const threePercentDeduction = revenue * 0.03

                // Step 5: Calculate profit
                // Profit = Revenue - Product Costs - Free Product Cost - 3% Deduction
                const profit = revenue - productCosts - freeProductCost - threePercentDeduction

                return sum + profit
            }, 0)
        }

        // Calculate free products: 1 free product for orders with 3+ products
        const calculateFreeProducts = (orderList: Order[]) => {
            return orderList.reduce((sum, order) => {
                if (order.status === 'cancelled') return sum
                // 1 free product for orders with 3+ products
                const freeProducts = order.orderSummary.totalItems >= 3 ? 1 : 0
                return sum + freeProducts
            }, 0)
        }

        // Get today's date
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get yesterday's date
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        // Filter orders by date
        // Filter orders by date
        type DateFilterType = "all" | "today" | "yesterday" | "days_before" | "custom"
        const filterOrdersByDate = (filter: DateFilterType) => {
            switch (filter) {
                case "today":
                    return orders.filter(order => {
                        const orderDate = new Date(order.orderDate || order.createdAt)
                        orderDate.setHours(0, 0, 0, 0)
                        return orderDate.getTime() === today.getTime()
                    })
                case "yesterday":
                    return orders.filter(order => {
                        const orderDate = new Date(order.orderDate || order.createdAt)
                        orderDate.setHours(0, 0, 0, 0)
                        return orderDate.getTime() === yesterday.getTime()
                    })
                case "days_before":
                    return orders.filter(order => {
                        const orderDate = new Date(order.orderDate || order.createdAt)
                        orderDate.setHours(0, 0, 0, 0)
                        return orderDate.getTime() < yesterday.getTime()
                    })
                case "custom":
                    if (!dateRange?.from) return orders
                    return orders.filter(order => {
                        const orderDate = new Date(order.orderDate || order.createdAt)
                        const from = startOfDay(dateRange.from!)
                        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!)
                        return orderDate >= from && orderDate <= to
                    })
                default:
                    return orders
            }
        }

        // Filter today's orders
        const todayOrders = filterOrdersByDate("today")
        const yesterdayOrders = filterOrdersByDate("yesterday")
        const daysBeforeOrders = filterOrdersByDate("days_before")
        const filteredOrders = filterOrdersByDate(dateFilter)

        // Filter returns based on date filter (for accurate profit calculation)
        const filterReturnsByDate = (filter: DateFilterType, returnsList: ReturnData[]) => {
            switch (filter) {
                case "today":
                    return returnsList.filter(r => {
                        const rDate = new Date(r.createdAt)
                        rDate.setHours(0, 0, 0, 0)
                        return rDate.getTime() === today.getTime()
                    })
                case "yesterday":
                    return returnsList.filter(r => {
                        const rDate = new Date(r.createdAt)
                        rDate.setHours(0, 0, 0, 0)
                        return rDate.getTime() === yesterday.getTime()
                    })
                case "days_before":
                    return returnsList.filter(r => {
                        const rDate = new Date(r.createdAt)
                        rDate.setHours(0, 0, 0, 0)
                        return rDate.getTime() < yesterday.getTime()
                    })
                case "custom":
                    if (!dateRange?.from) return returnsList
                    return returnsList.filter(r => {
                        const rDate = new Date(r.createdAt)
                        const from = startOfDay(dateRange.from!)
                        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!)
                        return rDate >= from && rDate <= to
                    })
                default:
                    return returnsList
            }
        }

        const filteredReturns = filterReturnsByDate(dateFilter, returns)
        const todayReturns = filterReturnsByDate("today", returns)
        const yesterdayReturns = filterReturnsByDate("yesterday", returns)
        const daysBeforeReturns = filterReturnsByDate("days_before", returns)

        // Calculate returns cost (3 TND per return)
        const calculateReturnsCost = (returnsList: ReturnData[]) => returnsList.length * 3

        // Calculate totals
        const totalRevenue = calculateRevenue(orders)
        const totalProfitBeforeReturns = calculateProfit(orders.filter(o => o.status !== 'cancelled'))
        const totalReturnsCost = calculateReturnsCost(returns)
        const totalProfit = totalProfitBeforeReturns - totalReturnsCost
        const totalFreeProducts = calculateFreeProducts(orders.filter(o => o.status !== 'cancelled'))

        // Calculate today's revenue and profit
        const todayRevenue = calculateRevenue(todayOrders)
        const todayProfitBeforeReturns = calculateProfit(todayOrders.filter(o => o.status !== 'cancelled'))
        const todayReturnsCost = calculateReturnsCost(todayReturns)
        const todayProfit = todayProfitBeforeReturns - todayReturnsCost
        const todayFreeProducts = calculateFreeProducts(todayOrders.filter(o => o.status !== 'cancelled'))

        // Calculate yesterday's revenue and profit
        const yesterdayRevenue = calculateRevenue(yesterdayOrders)
        const yesterdayProfitBeforeReturns = calculateProfit(yesterdayOrders.filter(o => o.status !== 'cancelled'))
        const yesterdayReturnsCost = calculateReturnsCost(yesterdayReturns)
        const yesterdayProfit = yesterdayProfitBeforeReturns - yesterdayReturnsCost
        const yesterdayFreeProducts = calculateFreeProducts(yesterdayOrders.filter(o => o.status !== 'cancelled'))

        // Calculate days before revenue and profit
        const daysBeforeRevenue = calculateRevenue(daysBeforeOrders)
        const daysBeforeProfitBeforeReturns = calculateProfit(daysBeforeOrders.filter(o => o.status !== 'cancelled'))
        const daysBeforeReturnsCost = calculateReturnsCost(daysBeforeReturns)
        const daysBeforeProfit = daysBeforeProfitBeforeReturns - daysBeforeReturnsCost
        const daysBeforeFreeProducts = calculateFreeProducts(daysBeforeOrders.filter(o => o.status !== 'cancelled'))

        // Calculate filtered revenue and profit based on date filter
        const filteredRevenue = calculateRevenue(filteredOrders)
        const filteredProfitBeforeReturns = calculateProfit(filteredOrders.filter(o => o.status !== 'cancelled'))
        const filteredReturnsCost = calculateReturnsCost(filteredReturns)
        const filteredProfit = filteredProfitBeforeReturns - filteredReturnsCost
        const filteredFreeProducts = calculateFreeProducts(filteredOrders.filter(o => o.status !== 'cancelled'))

        // Calculate revenue and profit by status
        const revenueByStatus: { [key: string]: number } = {}
        const profitByStatus: { [key: string]: number } = {}
        filteredOrders.forEach(order => {
            if (order.status === 'cancelled') return

            // Revenue = totalPrice - shipping
            const revenue = order.orderSummary.totalPrice - DELIVERY_FEE
            revenueByStatus[order.status] = (revenueByStatus[order.status] || 0) + Math.max(0, revenue)

            // Profit calculation
            const numberOfProducts = order.orderSummary.totalItems
            const productCosts = numberOfProducts * PRODUCT_COST
            const freeProductCost = numberOfProducts >= 3 ? FREE_PRODUCT_COST : 0
            const threePercentDeduction = revenue * 0.03
            const profit = revenue - productCosts - freeProductCost - threePercentDeduction

            profitByStatus[order.status] = (profitByStatus[order.status] || 0) + profit
        })

        // Calculate revenue and profit by city
        const revenueByCityMap: { [key: string]: { count: number; revenue: number; profit: number } } = {}
        filteredOrders.forEach(order => {
            if (order.status === 'cancelled') return
            const city = order.customer.city

            // Revenue = totalPrice - shipping
            const revenue = order.orderSummary.totalPrice - DELIVERY_FEE

            // Profit calculation
            const numberOfProducts = order.orderSummary.totalItems
            const productCosts = numberOfProducts * PRODUCT_COST
            const freeProductCost = numberOfProducts >= 3 ? FREE_PRODUCT_COST : 0
            const threePercentDeduction = revenue * 0.03
            const profit = revenue - productCosts - freeProductCost - threePercentDeduction

            if (!revenueByCityMap[city]) {
                revenueByCityMap[city] = { count: 0, revenue: 0, profit: 0 }
            }
            revenueByCityMap[city].count++
            revenueByCityMap[city].revenue += Math.max(0, revenue)
            revenueByCityMap[city].profit += profit
        })
        const ordersByCity = Object.entries(revenueByCityMap).map(([_id, data]) => ({
            _id,
            count: data.count,
            revenue: data.revenue,
            profit: data.profit
        }))

        // Calculate revenue and profit by product (distributed proportionally)
        const productRevenueMap: { [key: string]: { totalQuantity: number; totalRevenue: number; totalProfit: number; orderCount: number } } = {}
        filteredOrders.forEach(order => {
            if (order.status === 'cancelled') return

            // Calculate order-level revenue and profit
            const orderRevenue = order.orderSummary.totalPrice - DELIVERY_FEE
            const numberOfProducts = order.orderSummary.totalItems
            const productCosts = numberOfProducts * PRODUCT_COST
            const freeProductCost = numberOfProducts >= 3 ? FREE_PRODUCT_COST : 0
            const threePercentDeduction = orderRevenue * 0.03
            const orderProfit = orderRevenue - productCosts - freeProductCost - threePercentDeduction

            const orderTotalProducts = order.products.reduce((sum, p) => sum + (p.price * p.quantity), 0)

            order.products.forEach(product => {
                const productName = product.name
                if (!productRevenueMap[productName]) {
                    productRevenueMap[productName] = { totalQuantity: 0, totalRevenue: 0, totalProfit: 0, orderCount: 0 }
                }
                productRevenueMap[productName].totalQuantity += product.quantity
                // Distribute revenue and profit proportionally (product share of order revenue/profit)
                if (orderTotalProducts > 0) {
                    const productShare = (product.price * product.quantity) / orderTotalProducts
                    productRevenueMap[productName].totalRevenue += Math.max(0, orderRevenue) * productShare
                    productRevenueMap[productName].totalProfit += orderProfit * productShare
                }
                productRevenueMap[productName].orderCount++
            })
        })
        const topProducts = Object.entries(productRevenueMap).map(([_id, data]) => ({
            _id,
            totalQuantity: data.totalQuantity,
            totalRevenue: data.totalRevenue,
            totalProfit: data.totalProfit,
            orderCount: data.orderCount
        }))

        // Calculate revenue and profit over time
        const revenueOverTimeMap: { [key: string]: { count: number; revenue: number; profit: number } } = {}
        filteredOrders.forEach(order => {
            if (order.status === 'cancelled') return
            const dateKey = new Date(order.orderDate || order.createdAt).toISOString().split('T')[0]

            // Revenue = totalPrice - shipping
            const revenue = order.orderSummary.totalPrice - DELIVERY_FEE

            // Profit calculation
            const numberOfProducts = order.orderSummary.totalItems
            const productCosts = numberOfProducts * PRODUCT_COST
            const freeProductCost = numberOfProducts >= 3 ? FREE_PRODUCT_COST : 0
            const threePercentDeduction = revenue * 0.03
            const profit = revenue - productCosts - freeProductCost - threePercentDeduction

            if (!revenueOverTimeMap[dateKey]) {
                revenueOverTimeMap[dateKey] = { count: 0, revenue: 0, profit: 0 }
            }
            revenueOverTimeMap[dateKey].count++
            revenueOverTimeMap[dateKey].revenue += Math.max(0, revenue)
            revenueOverTimeMap[dateKey].profit += profit
        })
        const ordersOverTime = Object.entries(revenueOverTimeMap).map(([_id, data]) => ({
            _id,
            count: data.count,
            revenue: data.revenue,
            profit: data.profit
        }))

        // Calculate average order value without delivery
        const avgOrderValue = filteredOrders.length > 0 ? filteredRevenue / filteredOrders.length : 0
        const avgProfitPerOrder = filteredOrders.filter(o => o.status !== 'cancelled').length > 0
            ? filteredProfit / filteredOrders.filter(o => o.status !== 'cancelled').length
            : 0

        // Calculate sold cans by status
        const calculateSoldCans = (orderList: Order[], statusFilter: "all" | "pending" | "confirmed" | "preparing" | "shipped" | "delivered") => {
            return orderList.reduce((sum, order) => {
                if (order.status === 'cancelled') return sum
                if (statusFilter !== 'all' && order.status !== statusFilter) return sum
                return sum + order.orderSummary.totalItems
            }, 0)
        }

        const soldCansByStatus = {
            all: calculateSoldCans(orders, "all"),
            pending: calculateSoldCans(orders, "pending"),
            confirmed: calculateSoldCans(orders, "confirmed"),
            preparing: calculateSoldCans(orders, "preparing"),
            shipped: calculateSoldCans(orders, "shipped"),
            delivered: calculateSoldCans(orders, "delivered")
        }

        // Calculate cans by plant type (filtered by status)
        const cansByPlantTypeMap: { [key: string]: number } = {}
        orders.forEach(order => {
            if (order.status === 'cancelled') return
            // Apply status filter if not "all"
            if (cansStatusFilter !== 'all' && order.status !== cansStatusFilter) return
            order.products.forEach(product => {
                const plantType = product.name
                if (!cansByPlantTypeMap[plantType]) {
                    cansByPlantTypeMap[plantType] = 0
                }
                cansByPlantTypeMap[plantType] += product.quantity
            })
        })

        const cansByPlantType = Object.entries(cansByPlantTypeMap).map(([name, count]) => ({
            name,
            count
        })).sort((a, b) => b.count - a.count)

        // Get all unique plant types
        const allPlantTypes = Array.from(new Set(orders.flatMap(order =>
            order.products.map(p => p.name)
        ))).sort()

        // Calculate sold cans for selected plant type
        const soldCansForSelectedPlantType = plantTypeFilter === "all"
            ? soldCansByStatus[cansStatusFilter]
            : orders.reduce((sum, order) => {
                if (order.status === 'cancelled') return sum
                if (cansStatusFilter !== 'all' && order.status !== cansStatusFilter) return sum
                return sum + order.products
                    .filter(p => p.name === plantTypeFilter)
                    .reduce((productSum, p) => productSum + p.quantity, 0)
            }, 0)

        // Timeline Analysis - Orders by Hour of Day
        const ordersByHour: { [key: number]: number } = {}
        filteredOrders.forEach(order => {
            if (order.status === 'cancelled') return
            const orderDate = new Date(order.orderDate || order.createdAt)
            const hour = orderDate.getHours()
            ordersByHour[hour] = (ordersByHour[hour] || 0) + 1
        })
        const ordersByHourArray = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            hourLabel: `${i.toString().padStart(2, '0')}:00`,
            count: ordersByHour[i] || 0
        }))

        // Timeline Analysis - Orders by Day of Week
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
        const ordersByDayOfWeek: { [key: number]: { count: number; revenue: number } } = {}
        filteredOrders.forEach(order => {
            if (order.status === 'cancelled') return
            const orderDate = new Date(order.orderDate || order.createdAt)
            const dayOfWeek = orderDate.getDay()
            const revenue = order.orderSummary.totalPrice - DELIVERY_FEE
            if (!ordersByDayOfWeek[dayOfWeek]) {
                ordersByDayOfWeek[dayOfWeek] = { count: 0, revenue: 0 }
            }
            ordersByDayOfWeek[dayOfWeek].count++
            ordersByDayOfWeek[dayOfWeek].revenue += Math.max(0, revenue)
        })
        const ordersByDayOfWeekArray = dayNames.map((dayName, index) => ({
            day: dayName,
            dayIndex: index,
            count: ordersByDayOfWeek[index]?.count || 0,
            revenue: ordersByDayOfWeek[index]?.revenue || 0
        }))

        // Customer Metrics
        const uniqueCustomers = new Set(filteredOrders
            .filter(o => o.status !== 'cancelled')
            .map(o => o.customer.email || o.customer.phone))
        const customerOrderCount: { [key: string]: number } = {}
        filteredOrders.forEach(order => {
            if (order.status === 'cancelled') return
            const customerId = order.customer.email || order.customer.phone
            customerOrderCount[customerId] = (customerOrderCount[customerId] || 0) + 1
        })
        const repeatCustomers = Object.values(customerOrderCount).filter(count => count > 1).length
        const avgOrdersPerCustomer = uniqueCustomers.size > 0
            ? filteredOrders.filter(o => o.status !== 'cancelled').length / uniqueCustomers.size
            : 0

        // Conversion Rate Metrics (based on order status progression)
        const conversionRate = filteredOrders.length > 0
            ? ((filteredOrders.filter(o => o.status === 'delivered').length / filteredOrders.filter(o => o.status !== 'cancelled').length) * 100)
            : 0

        // Average items per order
        const avgItemsPerOrder = filteredOrders.filter(o => o.status !== 'cancelled').length > 0
            ? filteredOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.orderSummary.totalItems, 0) / filteredOrders.filter(o => o.status !== 'cancelled').length
            : 0

        // Calculate average daily, weekly, and monthly revenue and profit (excluding cancelled orders)
        const validOrders = orders.filter(o => {
            if (o.status === 'cancelled') return false
            if (averagesStatusFilter !== 'all' && o.status !== averagesStatusFilter) return false
            return true
        })

        // Group orders by date
        const ordersByDate: { [key: string]: { revenue: number; profit: number; count: number } } = {}
        validOrders.forEach(order => {
            const dateKey = new Date(order.orderDate || order.createdAt).toISOString().split('T')[0]
            const revenue = order.orderSummary.totalPrice - DELIVERY_FEE
            const numberOfProducts = order.orderSummary.totalItems
            const productCosts = numberOfProducts * PRODUCT_COST
            const freeProductCost = numberOfProducts >= 3 ? FREE_PRODUCT_COST : 0
            const threePercentDeduction = revenue * 0.03
            const profit = revenue - productCosts - freeProductCost - threePercentDeduction

            if (!ordersByDate[dateKey]) {
                ordersByDate[dateKey] = { revenue: 0, profit: 0, count: 0 }
            }
            ordersByDate[dateKey].revenue += Math.max(0, revenue)
            ordersByDate[dateKey].profit += profit
            ordersByDate[dateKey].count++
        })

        const uniqueDays = Object.keys(ordersByDate).length
        const avgDailyRevenue = uniqueDays > 0
            ? Object.values(ordersByDate).reduce((sum, day) => sum + day.revenue, 0) / uniqueDays
            : 0
        const avgDailyProfit = uniqueDays > 0
            ? Object.values(ordersByDate).reduce((sum, day) => sum + day.profit, 0) / uniqueDays
            : 0

        // Calculate weekly averages (group by week)
        const ordersByWeek: { [key: string]: { revenue: number; profit: number; count: number } } = {}
        validOrders.forEach(order => {
            const orderDate = new Date(order.orderDate || order.createdAt)
            // Get week number (ISO week)
            const year = orderDate.getFullYear()
            const startOfYear = new Date(year, 0, 1)
            const days = Math.floor((orderDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
            const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
            const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`

            const revenue = order.orderSummary.totalPrice - DELIVERY_FEE
            const numberOfProducts = order.orderSummary.totalItems
            const productCosts = numberOfProducts * PRODUCT_COST
            const freeProductCost = numberOfProducts >= 3 ? FREE_PRODUCT_COST : 0
            const threePercentDeduction = revenue * 0.03
            const profit = revenue - productCosts - freeProductCost - threePercentDeduction

            if (!ordersByWeek[weekKey]) {
                ordersByWeek[weekKey] = { revenue: 0, profit: 0, count: 0 }
            }
            ordersByWeek[weekKey].revenue += Math.max(0, revenue)
            ordersByWeek[weekKey].profit += profit
            ordersByWeek[weekKey].count++
        })

        const uniqueWeeks = Object.keys(ordersByWeek).length
        const avgWeeklyRevenue = uniqueWeeks > 0
            ? Object.values(ordersByWeek).reduce((sum, week) => sum + week.revenue, 0) / uniqueWeeks
            : 0
        const avgWeeklyProfit = uniqueWeeks > 0
            ? Object.values(ordersByWeek).reduce((sum, week) => sum + week.profit, 0) / uniqueWeeks
            : 0

        // Calculate monthly averages
        const ordersByMonth: { [key: string]: { revenue: number; profit: number; count: number } } = {}
        validOrders.forEach(order => {
            const orderDate = new Date(order.orderDate || order.createdAt)
            const monthKey = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`

            const revenue = order.orderSummary.totalPrice - DELIVERY_FEE
            const numberOfProducts = order.orderSummary.totalItems
            const productCosts = numberOfProducts * PRODUCT_COST
            const freeProductCost = numberOfProducts >= 3 ? FREE_PRODUCT_COST : 0
            const threePercentDeduction = revenue * 0.03
            const profit = revenue - productCosts - freeProductCost - threePercentDeduction

            if (!ordersByMonth[monthKey]) {
                ordersByMonth[monthKey] = { revenue: 0, profit: 0, count: 0 }
            }
            ordersByMonth[monthKey].revenue += Math.max(0, revenue)
            ordersByMonth[monthKey].profit += profit
            ordersByMonth[monthKey].count++
        })

        const uniqueMonths = Object.keys(ordersByMonth).length
        const avgMonthlyRevenue = uniqueMonths > 0
            ? Object.values(ordersByMonth).reduce((sum, month) => sum + month.revenue, 0) / uniqueMonths
            : 0
        const avgMonthlyProfit = uniqueMonths > 0
            ? Object.values(ordersByMonth).reduce((sum, month) => sum + month.profit, 0) / uniqueMonths
            : 0

        return {
            ...stats,
            totalRevenue: filteredRevenue, // Use filtered revenue based on date filter
            totalProfit: filteredProfit, // Use filtered profit based on date filter
            totalFreeProducts,
            todayRevenue,
            todayProfit,
            yesterdayRevenue,
            yesterdayProfit,
            daysBeforeRevenue,
            daysBeforeProfit,
            revenueByStatus,
            profitByStatus,
            ordersByCity,
            topProducts,
            ordersOverTime,
            avgOrderValue,
            avgProfitPerOrder,
            filteredOrdersCount: filteredOrders.length,
            soldCansByStatus,
            cansByPlantType,
            allPlantTypes,
            soldCansForSelectedPlantType,
            ordersByHour: ordersByHourArray,
            ordersByDayOfWeek: ordersByDayOfWeekArray,
            uniqueCustomersCount: uniqueCustomers.size,
            repeatCustomersCount: repeatCustomers,
            avgOrdersPerCustomer,
            conversionRate,
            avgItemsPerOrder,
            avgDailyRevenue,
            avgDailyProfit,
            avgWeeklyRevenue,
            avgWeeklyProfit,
            avgMonthlyRevenue,
            avgMonthlyProfit,

            returnsCount: filteredReturns.length
        }
    }, [stats, orders, dateFilter, dateRange, cansStatusFilter, plantTypeFilter, averagesStatusFilter, returns])

    const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            })

            if (response.ok) {
                fetchOrders()
                fetchStats()
            }
        } catch (error) {
            console.error("Error updating order status:", error)
        }
    }

    const deleteOrder = async (orderId: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer cette commande ?")) {
            try {
                const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
                    method: 'DELETE',
                })

                if (response.ok) {
                    fetchOrders()
                    fetchStats()
                }
            } catch (error) {
                console.error("Error deleting order:", error)
            }
        }
    }

    const onSubmit = async (data: OrderForm) => {
        setAddingOrder(true)
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })

            if (response.ok) {
                setIsAddOrderOpen(false)
                fetchOrders()
                fetchStats()
                form.reset()
            } else {
                console.error("Error adding order")
            }
        } catch (error) {
            console.error("Error adding order:", error)
        } finally {
            setAddingOrder(false)
        }
    }

    const getStatusBadge = (status: Order['status']) => {
        const statusConfig = {
            pending: {
                color: "bg-amber-100 text-amber-800 border-amber-300",
                icon: Clock,
                label: "En attente"
            },
            confirmed: {
                color: "bg-blue-100 text-blue-800 border-blue-300",
                icon: CheckCircle,
                label: "Confirmée"
            },
            preparing: {
                color: "bg-orange-100 text-orange-800 border-orange-300",
                icon: Package,
                label: "En préparation"
            },
            shipped: {
                color: "bg-purple-100 text-purple-800 border-purple-300",
                icon: Truck,
                label: "Expédiée"
            },
            delivered: {
                color: "bg-emerald-100 text-emerald-800 border-emerald-300",
                icon: CheckCircle,
                label: "Livrée"
            },
            cancelled: {
                color: "bg-red-100 text-red-800 border-red-300",
                icon: XCircle,
                label: "Annulée"
            },
        }

        const config = statusConfig[status]
        const IconComponent = config.icon

        return (
            <Badge variant="outline" className={`${config.color} flex items-center gap-1.5 px-3 py-1 border font-medium`}>
                <IconComponent className="h-3.5 w-3.5" />
                {config.label}
            </Badge>
        )
    }
    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer.phone.includes(searchTerm) ||
            order.customer.email.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || order.status === statusFilter
        const matchesCity = cityFilter === "" || order.customer.city.toLowerCase().includes(cityFilter.toLowerCase())

        return matchesSearch && matchesStatus && matchesCity
    })

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <DashboardHeader />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-900 font-medium">Chargement du tableau de bord...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardHeader activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 max-w-[1600px] mx-auto" data-content-area>
                {/* Header */}
                <div className="mb-4 md:mb-6 lg:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tableau de Bord</h1>
                            <p className="text-sm sm:text-base text-gray-900 mt-1 sm:mt-2">Gérez et suivez vos commandes en temps réel</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                                        <Package className="h-4 w-4" />
                                        <span className="hidden sm:inline">Ajouter Commande</span>
                                        <span className="sm:hidden">Ajouter</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-200">
                                    <DialogHeader className="border-b border-gray-200 pb-4">
                                        <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                            <Package className="h-5 w-5 text-emerald-600" />
                                            Ajouter une nouvelle commande
                                        </DialogTitle>
                                    </DialogHeader>
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-6 py-4">
                                            {/* Customer Information */}
                                            <div className="bg-gray-50 rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                                    <User className="h-5 w-5 text-emerald-600" />
                                                    Informations Client
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="customer.fullName"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-semibold text-gray-900">Nom Complet</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Ex: John Doe"
                                                                        {...field}
                                                                        className="text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage className="text-red-600" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="customer.phone"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-semibold text-gray-900">Téléphone</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Ex: +216 12 345 678"
                                                                        {...field}
                                                                        className="text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage className="text-red-600" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="customer.email"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-semibold text-gray-900">Email</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Ex: john@example.com"
                                                                        {...field}
                                                                        className="text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage className="text-red-600" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="customer.city"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-semibold text-gray-900">Ville</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Ex: Tunis"
                                                                        {...field}
                                                                        className="text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage className="text-red-600" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="customer.postalCode"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-semibold text-gray-900">Code Postal (optionnel)</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Ex: 1000"
                                                                        {...field}
                                                                        className="text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage className="text-red-600" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="customer.address"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-semibold text-gray-900">Adresse</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Ex: 123 Rue Exemple"
                                                                        {...field}
                                                                        className="text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage className="text-red-600" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            {/* Products */}
                                            <div className="bg-gray-50 rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                                    <Package className="h-5 w-5 text-emerald-600" />
                                                    Produits
                                                </h3>
                                                {fields.map((field, index) => (
                                                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-gray-200 pb-4 mb-4 last:border-0 last:mb-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-gray-900">Produit {index + 1}</span>
                                                        </div>
                                                        <FormField
                                                            control={form.control}
                                                            name={`products.${index}.name`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm font-semibold text-gray-900">Nom du Produit</FormLabel>
                                                                    <FormControl>
                                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                                            <SelectTrigger className="text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500">
                                                                                <SelectValue placeholder="Sélectionnez un produit" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="Basilic">Basilic</SelectItem>
                                                                                <SelectItem value="Origan">Origan</SelectItem>
                                                                                <SelectItem value="Œillet d'Inde">Œillet d'Inde</SelectItem>


                                                                            </SelectContent>
                                                                        </Select>
                                                                    </FormControl>
                                                                    <FormMessage className="text-red-600" />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`products.${index}.price`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm font-semibold text-gray-900">Prix (TND)</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            placeholder="Ex: 29.99"
                                                                            value={field.value === undefined || field.value === 0 || isNaN(field.value) ? "" : String(field.value)}
                                                                            onChange={(e) => {
                                                                                const value = e.target.valueAsNumber;
                                                                                field.onChange(isNaN(value) ? 0 : value);
                                                                            }}
                                                                            className="text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage className="text-red-600" />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`products.${index}.quantity`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm font-semibold text-gray-900">Quantité</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            placeholder="Ex: 1"
                                                                            value={field.value === undefined || field.value === 0 || isNaN(field.value) ? "" : String(field.value)}
                                                                            onChange={(e) => {
                                                                                const value = e.target.valueAsNumber;
                                                                                field.onChange(isNaN(value) || value < 1 ? 1 : value);
                                                                            }}
                                                                            className="text-gray-900 border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage className="text-red-600" />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => remove(index)}
                                                            className="md:col-span-4 mt-2 text-white bg-red-500 "
                                                        >
                                                            Supprimer Produit
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button
                                                    type="button"
                                                    onClick={() => append({ name: "", price: 0, quantity: 1, image: "" })}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4"
                                                >
                                                    <Package className="h-4 w-4 mr-2" />
                                                    Ajouter un Produit
                                                </Button>
                                            </div>



                                            {/* Sticky Footer */}
                                            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-4">
                                                <DialogClose asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="flex-1 text-gray-900 bg-white-50 border-gray-300 hover:bg-gray-100"
                                                    >
                                                        Annuler
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    type="submit"
                                                    disabled={addingOrder}
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    {addingOrder ? (
                                                        <>
                                                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                                            Ajout en cours...
                                                        </>
                                                    ) : (
                                                        'Ajouter Commande'
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                            <Button onClick={() => { fetchOrders(); fetchStats(); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                                <RefreshCw className="h-4 w-4" />
                                Actualiser
                            </Button>
                            <Button onClick={addReturn} disabled={addingReturn} className="gap-2 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
                                <Undo2 className="h-4 w-4" />
                                {addingReturn ? "Ajout..." : "Ajouter Retour"}
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {adjustedStats && (
                        <>
                            {/* Date Filter for Revenue */}
                            <Card className="bg-white border-gray-200 mb-4 md:mb-6">
                                <CardContent className="p-3 md:p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                                            <Label htmlFor="date-filter" className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Filtrer le revenu par période:</Label>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={dateFilter}
                                                    onValueChange={(value: typeof dateFilter) => {
                                                        setDateFilter(value)
                                                        if (value === "today") {
                                                            setDateRange({ from: new Date(), to: new Date() })
                                                        } else if (value === "yesterday") {
                                                            const y = subDays(new Date(), 1)
                                                            setDateRange({ from: y, to: y })
                                                        } else if (value === "all") {
                                                            setDateRange(undefined)
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger id="date-filter" className="w-full sm:w-48 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-gray-900">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Toutes les périodes</SelectItem>
                                                        <SelectItem value="today">Aujourd'hui</SelectItem>
                                                        <SelectItem value="yesterday">Hier</SelectItem>
                                                        <SelectItem value="days_before">Jours précédents</SelectItem>
                                                        <SelectItem value="custom">Période personnalisée</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            id="date"
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-[260px] justify-start text-left font-normal border-gray-300",
                                                                !dateRange && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {dateRange?.from ? (
                                                                dateRange.to ? (
                                                                    <>
                                                                        {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                                                                        {format(dateRange.to, "dd/MM/yyyy")}
                                                                    </>
                                                                ) : (
                                                                    format(dateRange.from, "dd/MM/yyyy")
                                                                )
                                                            ) : (
                                                                <span>Choisir une période</span>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            initialFocus
                                                            mode="range"
                                                            defaultMonth={dateRange?.from}
                                                            selected={dateRange}
                                                            onSelect={(range) => {
                                                                setDateRange(range)
                                                                if (range?.from) setDateFilter("custom")
                                                            }}
                                                            numberOfMonths={2}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-900">
                                            <span className="font-semibold">Note:</span> Le revenu exclut les frais de livraison (8 TND par commande) et 3% de commission. Le profit exclut également le coût de production (6 TND par produit) et les coûts de retour (3 TND par retour).
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6 mb-8">
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Commandes</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.filteredOrdersCount || adjustedStats.totalOrders}</p>
                                                <p className="text-xs md:text-sm text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                                                    <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                                    +{adjustedStats.todayOrders} aujourd'hui
                                                </p>
                                            </div>
                                            <div className="p-3 md:p-4 bg-blue-100 rounded-xl flex-shrink-0 ml-2">
                                                <ShoppingCart className="h-5 w-5 md:h-7 md:w-7 text-blue-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Revenu Total</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.totalRevenue.toFixed(2)} TND</p>
                                                <p className="text-xs md:text-sm text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                                                    <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                                    <span className="truncate">
                                                        {dateFilter === "today" && `Aujourd'hui: ${adjustedStats.totalRevenue.toFixed(2)} TND`}
                                                        {dateFilter === "yesterday" && `Hier: ${adjustedStats.yesterdayRevenue?.toFixed(2) || "0.00"} TND`}
                                                        {dateFilter === "days_before" && `Jours précédents: ${adjustedStats.daysBeforeRevenue?.toFixed(2) || "0.00"} TND`}
                                                        {dateFilter === "custom" && `Période sélectionnée: ${adjustedStats.totalRevenue.toFixed(2)} TND`}
                                                        {dateFilter === "all" && `Aujourd'hui: ${adjustedStats.todayRevenue.toFixed(2)} TND`}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="p-3 md:p-4 bg-emerald-100 rounded-xl flex-shrink-0 ml-2">
                                                <DollarSign className="h-5 w-5 md:h-7 md:w-7 text-emerald-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Profit Total</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.totalProfit?.toFixed(2) || "0.00"} TND</p>
                                                <p className="text-xs md:text-sm text-green-600 mt-2 flex items-center gap-1 font-medium">
                                                    <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                                    <span className="truncate">
                                                        {dateFilter === "today" && `Aujourd'hui: ${adjustedStats.todayProfit?.toFixed(2) || "0.00"} TND`}
                                                        {dateFilter === "yesterday" && `Hier: ${adjustedStats.yesterdayProfit?.toFixed(2) || "0.00"} TND`}
                                                        {dateFilter === "days_before" && `Jours précédents: ${adjustedStats.daysBeforeProfit?.toFixed(2) || "0.00"} TND`}
                                                        {dateFilter === "custom" && `Période sélectionnée: ${adjustedStats.totalProfit?.toFixed(2) || "0.00"} TND`}
                                                        {dateFilter === "all" && `Aujourd'hui: ${adjustedStats.todayProfit?.toFixed(2) || "0.00"} TND`}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="p-3 md:p-4 bg-green-100 rounded-xl flex-shrink-0 ml-2">
                                                <BarChart3 className="h-5 w-5 md:h-7 md:w-7 text-green-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Retours</p>
                                                <p className="text-2xl md:text-3xl font-bold text-red-600 mt-2">{adjustedStats.returnsCount || 0}</p>
                                                <p className="text-xs md:text-sm text-gray-600 mt-2 font-medium">Commandes retournées</p>
                                            </div>
                                            <div className="p-3 md:p-4 bg-red-100 rounded-xl flex-shrink-0 ml-2">
                                                <Undo2 className="h-5 w-5 md:h-7 md:w-7 text-red-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">En Attente</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.pendingOrders}</p>
                                                <p className="text-xs md:text-sm text-gray-600 mt-2 font-medium">À traiter</p>
                                            </div>
                                            <div className="p-3 md:p-4 bg-amber-100 rounded-xl flex-shrink-0 ml-2">
                                                <Clock className="h-5 w-5 md:h-7 md:w-7 text-amber-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Confirmées</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.confirmedOrders}</p>
                                                <p className="text-xs md:text-sm text-gray-600 mt-2 font-medium">À préparer</p>
                                            </div>
                                            <div className="p-3 md:p-4 bg-blue-100 rounded-xl flex-shrink-0 ml-2">
                                                <CheckCircle className="h-5 w-5 md:h-7 md:w-7 text-blue-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">En Préparation</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.preparingOrders}</p>
                                                <p className="text-xs md:text-sm text-gray-600 mt-2 font-medium">En cours</p>
                                            </div>
                                            <div className="p-3 md:p-4 bg-orange-100 rounded-xl flex-shrink-0 ml-2">
                                                <Package className="h-5 w-5 md:h-7 md:w-7 text-orange-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Expédiées</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.shippedOrders}</p>
                                                <p className="text-xs md:text-sm text-gray-600 mt-2 font-medium">En transit</p>
                                            </div>
                                            <div className="p-3 md:p-4 bg-purple-100 rounded-xl flex-shrink-0 ml-2">
                                                <Truck className="h-5 w-5 md:h-7 md:w-7 text-purple-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Annulées</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.cancelledOrders}</p>
                                                <p className="text-xs md:text-sm text-gray-600 mt-2 font-medium">Commandes annulées</p>
                                            </div>
                                            <div className="p-3 md:p-4 bg-red-100 rounded-xl flex-shrink-0 ml-2">
                                                <XCircle className="h-5 w-5 md:h-7 md:w-7 text-red-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                            </div>

                            {/* Cans Metrics Section */}
                            <div className="mb-6 md:mb-8">
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Métriques des Boîtes</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                                    {/* Free Given Cans Card */}
                                    <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                        <CardHeader>
                                            <CardTitle className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <Gift className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                                                Boîtes Gratuites Offertes
                                            </CardTitle>
                                            <CardDescription className="text-sm text-gray-600">Boîtes offertes (commande ≥ 3 boîtes)</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-3xl md:text-4xl font-bold text-gray-900">
                                                        {adjustedStats.totalFreeProducts || 0}
                                                    </p>
                                                    <p className="text-xs md:text-sm text-gray-600 mt-1">boîtes gratuites</p>
                                                    <p className="text-xs text-emerald-600 mt-2 font-medium">
                                                        Promotion: 1 boîte gratuite pour chaque commande de 3+ boîtes
                                                    </p>
                                                </div>
                                                <div className="p-3 md:p-4 bg-emerald-100 rounded-xl">
                                                    <Gift className="h-6 w-6 md:h-8 md:w-8 text-emerald-600" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Cans by Plant Type Section */}
                                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                    <CardHeader className="pb-3 md:pb-4">
                                        <CardTitle className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            <Leaf className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                                            Boîtes par Type de Plante
                                        </CardTitle>
                                        <CardDescription className="text-sm text-gray-600">Analyse des ventes par type de plante</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="plant-type-filter" className="text-sm font-semibold text-gray-900">Sélectionner un type de plante:</Label>
                                                    <Select value={plantTypeFilter} onValueChange={setPlantTypeFilter}>
                                                        <SelectTrigger id="plant-type-filter" className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-gray-900">
                                                            <SelectValue placeholder="Tous les types" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Tous les types</SelectItem>
                                                            {adjustedStats.allPlantTypes?.map((plantType) => (
                                                                <SelectItem key={plantType} value={plantType}>{plantType}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="cans-status-filter" className="text-sm font-semibold text-gray-900">Filtrer par statut:</Label>
                                                    <Select value={cansStatusFilter} onValueChange={(value: typeof cansStatusFilter) => setCansStatusFilter(value)}>
                                                        <SelectTrigger id="cans-status-filter" className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-gray-900">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Tous</SelectItem>
                                                            <SelectItem value="pending">En attente</SelectItem>
                                                            <SelectItem value="confirmed">Confirmée</SelectItem>
                                                            <SelectItem value="preparing">En préparation</SelectItem>
                                                            <SelectItem value="shipped">Expédiée</SelectItem>
                                                            <SelectItem value="delivered">Livrée</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            {plantTypeFilter === "all" ? (
                                                <div className="space-y-3">
                                                    <div className="text-base md:text-lg font-semibold text-gray-900 mb-3">
                                                        Total de boîtes vendues par type
                                                        {cansStatusFilter !== "all" && (
                                                            <span className="text-xs md:text-sm font-normal text-gray-600 ml-2">
                                                                (statut: {cansStatusFilter === "pending" ? "En attente" : cansStatusFilter === "confirmed" ? "Confirmée" : cansStatusFilter === "preparing" ? "En préparation" : cansStatusFilter === "shipped" ? "Expédiée" : "Livrée"})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {adjustedStats.cansByPlantType && adjustedStats.cansByPlantType.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                                            {adjustedStats.cansByPlantType.map((item) => (
                                                                <div key={item.name} className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200 hover:shadow-md transition-shadow">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs md:text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                                                            <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">{item.count}</p>
                                                                            <p className="text-xs text-gray-600 mt-1">boîtes vendues</p>
                                                                        </div>
                                                                        <Leaf className="h-5 w-5 md:h-6 md:w-6 text-green-600 flex-shrink-0 ml-2" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {/* Total Cans Card */}
                                                            <div className="bg-blue-50 rounded-lg p-3 md:p-4 border-2 border-blue-200 hover:shadow-md transition-shadow">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs md:text-sm font-semibold text-gray-900">Total Boîtes</p>
                                                                        <p className="text-xl md:text-2xl font-bold text-blue-600 mt-1">
                                                                            {adjustedStats.cansByPlantType.reduce((sum, plant) => sum + plant.count, 0)}
                                                                        </p>
                                                                        <p className="text-xs text-gray-600 mt-1">boîtes vendues</p>
                                                                    </div>
                                                                    <Package className="h-5 w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0 ml-2" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-600 text-center py-4">Aucune donnée disponible</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-50 rounded-lg p-4 md:p-6 border border-emerald-200">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs md:text-sm font-semibold text-gray-900 mb-1">Type de plante sélectionné:</p>
                                                            <p className="text-lg md:text-xl font-bold text-emerald-600">{plantTypeFilter}</p>
                                                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                                                                {adjustedStats.soldCansForSelectedPlantType || 0}
                                                            </p>
                                                            <p className="text-xs md:text-sm text-gray-600 mt-1">
                                                                boîtes vendues
                                                                {cansStatusFilter !== "all" && ` (statut: ${cansStatusFilter === "pending" ? "En attente" : cansStatusFilter === "confirmed" ? "Confirmée" : cansStatusFilter === "preparing" ? "En préparation" : cansStatusFilter === "shipped" ? "Expédiée" : "Livrée"})`}
                                                            </p>
                                                        </div>
                                                        <div className="p-3 md:p-4 bg-emerald-100 rounded-xl">
                                                            <Leaf className="h-6 w-6 md:h-8 md:w-8 text-emerald-600" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}

                    {/* Analytics Content */}
                    {activeTab === "analytics" && (
                        <div id="analytics-section">
                            {adjustedStats && (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 md:mb-8">
                                        <Card className="bg-white border-gray-200">
                                            <CardHeader>
                                                <CardTitle className="text-lg font-semibold text-gray-900">Top Produits</CardTitle>
                                                <CardDescription className="text-gray-900">Par quantité vendue</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <BarChart data={adjustedStats.topProducts}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="_id" angle={-45} textAnchor="end" height={70} />
                                                        <YAxis />
                                                        <Tooltip />
                                                        <Legend />
                                                        <Bar dataKey="totalQuantity" name="Quantité" fill="#3b82f6" />
                                                        <Bar dataKey="totalRevenue" name="Revenu (TND)" fill="#22c55e" />
                                                        <Bar dataKey="totalProfit" name="Profit (TND)" fill="#10b981" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-white border-gray-200">
                                            <CardHeader>
                                                <CardTitle className="text-lg font-semibold text-gray-900">Revenu par Statut</CardTitle>
                                                <CardDescription className="text-gray-900">Distribution du revenu</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <PieChart>
                                                        <Pie
                                                            data={Object.entries(adjustedStats.revenueByStatus).map(([key, value]) => ({ name: key, value }))}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            outerRadius={80}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                            label={({ name, percent }) => `${name} ${(percent as any * 100).toFixed(0)}% `}
                                                        >
                                                            {Object.entries(adjustedStats.revenueByStatus).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Average Revenue & Profit Metrics */}
                                    <div className="mb-6 md:mb-8">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
                                            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Moyennes de Revenu et Profit</h2>
                                            <div className="flex items-center gap-3">
                                                <Label htmlFor="averages-status-filter" className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Filtrer par statut:</Label>
                                                <Select value={averagesStatusFilter} onValueChange={(value: typeof averagesStatusFilter) => setAveragesStatusFilter(value)}>
                                                    <SelectTrigger id="averages-status-filter" className="w-full sm:w-48 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-gray-900">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Tous</SelectItem>
                                                        <SelectItem value="pending">En attente</SelectItem>
                                                        <SelectItem value="confirmed">Confirmée</SelectItem>
                                                        <SelectItem value="preparing">En préparation</SelectItem>
                                                        <SelectItem value="shipped">Expédiée</SelectItem>
                                                        <SelectItem value="delivered">Livrée</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                            {/* Daily Averages */}
                                            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                                                        Moyennes Quotidiennes
                                                    </CardTitle>
                                                    <CardDescription className="text-sm text-gray-600">
                                                        Par jour
                                                        {averagesStatusFilter !== "all" && (
                                                            <span className="text-xs text-gray-500 ml-1">
                                                                (statut: {averagesStatusFilter === "pending" ? "En attente" : averagesStatusFilter === "confirmed" ? "Confirmée" : averagesStatusFilter === "preparing" ? "En préparation" : averagesStatusFilter === "shipped" ? "Expédiée" : "Livrée"})
                                                            </span>
                                                        )}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-600">Revenu Moyen</p>
                                                                <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">
                                                                    {adjustedStats.avgDailyRevenue?.toFixed(2) || "0.00"} TND
                                                                </p>
                                                            </div>
                                                            <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                                                        </div>
                                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-600">Profit Moyen</p>
                                                                <p className="text-xl md:text-2xl font-bold text-green-600 mt-1">
                                                                    {adjustedStats.avgDailyProfit?.toFixed(2) || "0.00"} TND
                                                                </p>
                                                            </div>
                                                            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Weekly Averages */}
                                            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                                                        Moyennes Hebdomadaires
                                                    </CardTitle>
                                                    <CardDescription className="text-sm text-gray-600">
                                                        Par semaine
                                                        {averagesStatusFilter !== "all" && (
                                                            <span className="text-xs text-gray-500 ml-1">
                                                                (statut: {averagesStatusFilter === "pending" ? "En attente" : averagesStatusFilter === "confirmed" ? "Confirmée" : averagesStatusFilter === "preparing" ? "En préparation" : averagesStatusFilter === "shipped" ? "Expédiée" : "Livrée"})
                                                            </span>
                                                        )}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-600">Revenu Moyen</p>
                                                                <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">
                                                                    {adjustedStats.avgWeeklyRevenue?.toFixed(2) || "0.00"} TND
                                                                </p>
                                                            </div>
                                                            <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                                                        </div>
                                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-600">Profit Moyen</p>
                                                                <p className="text-xl md:text-2xl font-bold text-green-600 mt-1">
                                                                    {adjustedStats.avgWeeklyProfit?.toFixed(2) || "0.00"} TND
                                                                </p>
                                                            </div>
                                                            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Monthly Averages */}
                                            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                                                        Moyennes Mensuelles
                                                    </CardTitle>
                                                    <CardDescription className="text-sm text-gray-600">
                                                        Par mois
                                                        {averagesStatusFilter !== "all" && (
                                                            <span className="text-xs text-gray-500 ml-1">
                                                                (statut: {averagesStatusFilter === "pending" ? "En attente" : averagesStatusFilter === "confirmed" ? "Confirmée" : averagesStatusFilter === "preparing" ? "En préparation" : averagesStatusFilter === "shipped" ? "Expédiée" : "Livrée"})
                                                            </span>
                                                        )}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-600">Revenu Moyen</p>
                                                                <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">
                                                                    {adjustedStats.avgMonthlyRevenue?.toFixed(2) || "0.00"} TND
                                                                </p>
                                                            </div>
                                                            <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                                                        </div>
                                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-600">Profit Moyen</p>
                                                                <p className="text-xl md:text-2xl font-bold text-green-600 mt-1">
                                                                    {adjustedStats.avgMonthlyProfit?.toFixed(2) || "0.00"} TND
                                                                </p>
                                                            </div>
                                                            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>

                                    {/* Customer & Performance Metrics */}
                                    <div className="mb-6 md:mb-8">
                                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Métriques Clients & Performance</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                                <CardContent className="p-4 md:p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Clients Uniques</p>
                                                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.uniqueCustomersCount || 0}</p>
                                                            <p className="text-xs text-gray-500 mt-1">clients actifs</p>
                                                        </div>
                                                        <div className="p-3 md:p-4 bg-indigo-100 rounded-xl">
                                                            <Users className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                                <CardContent className="p-4 md:p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Clients Récurrents</p>
                                                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.repeatCustomersCount || 0}</p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {adjustedStats.uniqueCustomersCount && adjustedStats.uniqueCustomersCount > 0
                                                                    ? `${((adjustedStats.repeatCustomersCount || 0) / adjustedStats.uniqueCustomersCount * 100).toFixed(1)}% du total`
                                                                    : '0% du total'}
                                                            </p>
                                                        </div>
                                                        <div className="p-3 md:p-4 bg-purple-100 rounded-xl">
                                                            <Repeat className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                                <CardContent className="p-4 md:p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Taux de Conversion</p>
                                                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.conversionRate?.toFixed(1) || 0}%</p>
                                                            <p className="text-xs text-gray-500 mt-1">commandes livrées</p>
                                                        </div>
                                                        <div className="p-3 md:p-4 bg-emerald-100 rounded-xl">
                                                            <Target className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                                <CardContent className="p-4 md:p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Moy. Articles/Commande</p>
                                                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{adjustedStats.avgItemsPerOrder?.toFixed(1) || 0}</p>
                                                            <p className="text-xs text-gray-500 mt-1">articles par commande</p>
                                                        </div>
                                                        <div className="p-3 md:p-4 bg-cyan-100 rounded-xl">
                                                            <Activity className="h-5 w-5 md:h-6 md:w-6 text-cyan-600" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>

                                    {/* Timeline Analysis Section */}
                                    <div className="mb-6 md:mb-8">
                                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Analyse Temporelle des Ventes</h2>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                                            {/* Orders by Hour of Day */}
                                            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                                <CardHeader>
                                                    <CardTitle className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                        <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                                                        Commandes par Heure de la Journée
                                                    </CardTitle>
                                                    <CardDescription className="text-sm text-gray-600">Heures de pointe pour les ventes</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    {adjustedStats.ordersByHour && adjustedStats.ordersByHour.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={300}>
                                                            <BarChart data={adjustedStats.ordersByHour}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                                <XAxis
                                                                    dataKey="hourLabel"
                                                                    angle={-45}
                                                                    textAnchor="end"
                                                                    height={80}
                                                                    tick={{ fontSize: 12 }}
                                                                    interval={2}
                                                                />
                                                                <YAxis tick={{ fontSize: 12 }} />
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                                                    labelStyle={{ color: '#374151', fontWeight: 600 }}
                                                                />
                                                                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <div className="text-center py-12 text-gray-500">
                                                            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                                            <p>Aucune donnée disponible</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* Orders by Day of Week */}
                                            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-200">
                                                <CardHeader>
                                                    <CardTitle className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                                                        Commandes par Jour de la Semaine
                                                    </CardTitle>
                                                    <CardDescription className="text-sm text-gray-600">Jours les plus actifs</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    {adjustedStats.ordersByDayOfWeek && adjustedStats.ordersByDayOfWeek.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={300}>
                                                            <BarChart data={adjustedStats.ordersByDayOfWeek}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                                <XAxis
                                                                    dataKey="day"
                                                                    tick={{ fontSize: 12 }}
                                                                />
                                                                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                                                    labelStyle={{ color: '#374151', fontWeight: 600 }}
                                                                    formatter={(value: any, name: string) => {
                                                                        if (name === 'revenue') return [`${value.toFixed(2)} TND`, 'Revenu']
                                                                        return [value, 'Commandes']
                                                                    }}
                                                                />
                                                                <Legend />
                                                                <Bar yAxisId="left" dataKey="count" fill="#22c55e" name="Commandes" radius={[8, 8, 0, 0]} />
                                                                <Bar yAxisId="right" dataKey="revenue" fill="#3b82f6" name="Revenu (TND)" radius={[8, 8, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <div className="text-center py-12 text-gray-500">
                                                            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                                            <p>Aucune donnée disponible</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Orders Content */}
                    {activeTab === "orders" && (
                        <div id="orders-section" className="mt-6">
                            <Card className="mb-6 border-gray-200 bg-white">
                                <CardHeader className="pb-4 border-b border-gray-100">
                                    <CardTitle className="text-lg font-semibold text-gray-900">Recherche et Filtres</CardTitle>
                                    <CardDescription className="text-gray-900">Filtrez les commandes selon vos critères</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="search" className="text-sm font-semibold text-gray-900">Rechercher</Label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-900" />
                                                <Input
                                                    id="search"
                                                    placeholder="Numéro, nom, téléphone..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-gray-900"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="status" className="text-sm font-semibold text-gray-900">Statut</Label>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-gray-900">
                                                    <SelectValue placeholder="Tous les statuts" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                                    <SelectItem value="pending">En attente</SelectItem>
                                                    <SelectItem value="confirmed">Confirmée</SelectItem>
                                                    <SelectItem value="preparing">En préparation</SelectItem>
                                                    <SelectItem value="shipped">Expédiée</SelectItem>
                                                    <SelectItem value="delivered">Livrée</SelectItem>
                                                    <SelectItem value="cancelled">Annulée</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="city" className="text-sm font-semibold text-gray-900">Ville</Label>
                                            <Input
                                                id="city"
                                                placeholder="Filtrer par ville..."
                                                value={cityFilter}
                                                onChange={(e) => setCityFilter(e.target.value)}
                                                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-gray-900"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 text-sm text-gray-900 font-medium">
                                        {filteredOrders.length} commande{filteredOrders.length !== 1 ? 's' : ''} trouvée{filteredOrders.length !== 1 ? 's' : ''}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-gray-200 shadow-sm bg-white">
                                <CardHeader className="border-b border-gray-200">
                                    <CardTitle className="text-xl font-bold text-gray-900">Liste des Commandes</CardTitle>
                                    <CardDescription className="text-gray-900">Gérez le statut de vos commandes</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {filteredOrders.length === 0 ? (
                                        <div className="text-center py-16">
                                            <Package className="h-16 w-16 text-gray-900 mx-auto mb-4" />
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune commande trouvée</h3>
                                            <p className="text-gray-900 max-w-sm mx-auto">
                                                {orders.length === 0
                                                    ? "Aucune commande n'a été passée pour le moment."
                                                    : "Aucune commande ne correspond à vos critères de recherche."
                                                }
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-100 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Commande</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Client</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Produits</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Total</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Statut</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {filteredOrders.map((order) => (
                                                        <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="font-bold text-gray-900">{order.orderNumber}</div>
                                                                <div className="text-sm text-gray-900 font-medium mt-1">
                                                                    {new Date(order.orderDate).toLocaleDateString('fr-FR')}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="font-semibold text-gray-900">{order.customer.fullName}</div>
                                                                <div className="text-sm text-gray-900 flex items-center gap-1.5 mt-1">
                                                                    <MapPin className="h-3.5 w-3.5" />
                                                                    {order.customer.city}
                                                                </div>
                                                                <div className="text-sm text-gray-900 flex items-center gap-1.5 mt-1">
                                                                    <Phone className="h-3.5 w-3.5" />
                                                                    {order.customer.phone}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm font-semibold text-gray-900">{order.products.length} produit(s)</div>
                                                                <div className="text-sm text-gray-900">{order.orderSummary.totalItems} article(s)</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="font-bold text-gray-900">{order.orderSummary.totalPrice.toFixed(2)} TND</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    {getStatusBadge(order.status)}
                                                                    {order.note && order.note.trim() !== '' && (
                                                                        <Dialog>
                                                                            <DialogTrigger asChild>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300"
                                                                                >
                                                                                    <FileText className="h-3.5 w-3.5 mr-1" />
                                                                                    Note
                                                                                </Button>
                                                                            </DialogTrigger>
                                                                            <DialogContent className="max-w-md bg-white border-gray-200">
                                                                                <DialogHeader>
                                                                                    <DialogTitle className="text-black font-semibold">Note - {order.orderNumber}</DialogTitle>
                                                                                </DialogHeader>
                                                                                <div className="mt-4">
                                                                                    <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">{order.note}</p>
                                                                                </div>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {new Date(order.orderDate).toLocaleDateString('fr-FR')}
                                                                </div>
                                                                <div className="text-sm text-gray-900">
                                                                    {new Date(order.orderDate).toLocaleTimeString('fr-FR', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        asChild
                                                                        className="text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border-blue-300"
                                                                    >
                                                                        <Link href={`/dashboard/orders/${order._id}`}>
                                                                            <Eye className="h-4 w-4" />
                                                                        </Link>
                                                                    </Button>
                                                                    <Select
                                                                        value={order.status}
                                                                        onValueChange={(value: Order['status']) => updateOrderStatus(order._id, value)}
                                                                    >
                                                                        <SelectTrigger className="h-9 w-40 border-gray-300 text-gray-900 font-medium">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="pending">En attente</SelectItem>
                                                                            <SelectItem value="confirmed">Confirmée</SelectItem>
                                                                            <SelectItem value="preparing">En préparation</SelectItem>
                                                                            <SelectItem value="shipped">Expédiée</SelectItem>
                                                                            <SelectItem value="delivered">Livrée</SelectItem>
                                                                            <SelectItem value="cancelled">Annulée</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => deleteOrder(order._id)}
                                                                        className="text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border-red-300"
                                                                    >
                                                                        <XCircle className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
