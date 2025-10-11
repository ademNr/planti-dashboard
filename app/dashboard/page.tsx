
// app/dashboard/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Package, DollarSign, ShoppingCart, Search,
    Eye, Truck, CheckCircle, Clock, XCircle, RefreshCw,
    BarChart3, MapPin, Phone, TrendingUp, User, CreditCard
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    createdAt: string
    updatedAt: string
}

interface DashboardStats {
    totalOrders: number
    totalRevenue: number
    pendingOrders: number
    confirmedOrders: number
    preparingOrders: number
    shippedOrders: number
    deliveredOrders: number
    cancelledOrders: number
    avgOrderValue: number
    todayOrders: number
    todayRevenue: number
    ordersByStatus: {
        [key: string]: number
    }
    revenueByStatus: {
        [key: string]: number
    }
    ordersByCity: { _id: string; count: number; revenue: number }[]
    topProducts: { _id: string; totalQuantity: number; totalRevenue: number; orderCount: number }[]
    recentOrders: Order[]
    ordersOverTime: { _id: string; count: number; revenue: number }[]
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
    const [isAddOrderOpen, setIsAddOrderOpen] = useState(false)
    const [addingOrder, setAddingOrder] = useState(false)

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
    }, [])

    const fetchOrders = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders`)
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
            <DashboardHeader />
            <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
                            <p className="text-gray-900 mt-2">Gérez et suivez vos commandes en temps réel</p>
                        </div>
                        <div className="flex gap-2">
                            <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                        <Package className="h-4 w-4" />
                                        Ajouter Commande
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
                                                                            value={field.value === 0 || isNaN(field.value) ? "" : field.value}
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
                                                                            value={field.value === 0 || isNaN(field.value) ? "" : field.value}
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
                            <Button onClick={() => { fetchOrders(); fetchStats(); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                                <RefreshCw className="h-4 w-4" />
                                Actualiser
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Total Commandes</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
                                            <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                                                <TrendingUp className="h-3.5 w-3.5" />
                                                +{stats.todayOrders} aujourd'hui
                                            </p>
                                        </div>
                                        <div className="p-4 bg-blue-100 rounded-xl">
                                            <ShoppingCart className="h-7 w-7 text-blue-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Revenu Total</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRevenue.toFixed(2)} TND</p>
                                            <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                                                <TrendingUp className="h-3.5 w-3.5" />
                                                +{stats.todayRevenue.toFixed(2)} aujourd'hui
                                            </p>
                                        </div>
                                        <div className="p-4 bg-emerald-100 rounded-xl">
                                            <DollarSign className="h-7 w-7 text-emerald-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">En Attente</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingOrders}</p>
                                            <p className="text-sm text-gray-900 mt-2 font-medium">À traiter</p>
                                        </div>
                                        <div className="p-4 bg-amber-100 rounded-xl">
                                            <Clock className="h-7 w-7 text-amber-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Confirmées</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.confirmedOrders}</p>
                                            <p className="text-sm text-gray-900 mt-2 font-medium">À préparer</p>
                                        </div>
                                        <div className="p-4 bg-blue-100 rounded-xl">
                                            <CheckCircle className="h-7 w-7 text-blue-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">En Préparation</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.preparingOrders}</p>
                                            <p className="text-sm text-gray-900 mt-2 font-medium">En cours</p>
                                        </div>
                                        <div className="p-4 bg-orange-100 rounded-xl">
                                            <Package className="h-7 w-7 text-orange-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Expédiées</p>
                                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.shippedOrders}</p>
                                            <p className="text-sm text-gray-900 mt-2 font-medium">En transit</p>
                                        </div>
                                        <div className="p-4 bg-purple-100 rounded-xl">
                                            <Truck className="h-7 w-7 text-purple-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>
                    )}

                    {/* Tabs */}
                    <Tabs defaultValue="analytics" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
                            <TabsTrigger
                                value="analytics"
                                className="text-gray-900 data-[state=active]:bg-gray-900 data-[state=active]:text-white font-medium"
                            >
                                Analyses
                            </TabsTrigger>
                            <TabsTrigger
                                value="orders"
                                className="text-gray-900 data-[state=active]:bg-gray-900 data-[state=active]:text-white font-medium"
                            >
                                Commandes
                            </TabsTrigger>
                            <TabsTrigger
                                value="recent"
                                className="text-gray-900 data-[state=active]:bg-gray-900 data-[state=active]:text-white font-medium"
                            >
                                Récentes
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="analytics" className="mt-6">
                            {stats && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card className="bg-white border-gray-200">
                                        <CardHeader>
                                            <CardTitle className="text-lg font-semibold text-gray-900">Top Produits</CardTitle>
                                            <CardDescription className="text-gray-900">Par quantité vendue</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={stats.topProducts}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="_id" angle={-45} textAnchor="end" height={70} />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="totalQuantity" name="Quantité" fill="#3b82f6" />
                                                    <Bar dataKey="totalRevenue" name="Revenu (TND)" fill="#22c55e" />
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
                                                        data={Object.entries(stats.revenueByStatus).map(([key, value]) => ({ name: key, value }))}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        outerRadius={80}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                        label={({ name, percent }) => `${name} ${(percent as any * 100).toFixed(0)}% `}
                                                    >
                                                        {Object.entries(stats.revenueByStatus).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="orders" className="mt-6">
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
                                                                {getStatusBadge(order.status)}
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
                        </TabsContent>

                        <TabsContent value="recent" className="mt-6">
                            <Card className="bg-white border-gray-200">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold text-gray-900">Commandes Récentes</CardTitle>
                                    <CardDescription className="text-gray-900">Les 5 dernières commandes</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {stats && stats.recentOrders && stats.recentOrders.length > 0 ? (
                                        <div className="space-y-4">
                                            {stats.recentOrders.map((order) => (
                                                <div key={order._id} className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0">
                                                    <div>
                                                        <Link href={`/dashboard/orders/${order._id}`} className="font-bold text-gray-900 hover:underline">
                                                            {order.orderNumber}
                                                        </Link>
                                                        <p className="text-sm text-gray-900">{order.customer.fullName} - {order.orderSummary.totalPrice.toFixed(2)} TND</p>
                                                        <p className="text-sm text-gray-900">
                                                            {new Date(order.createdAt).toLocaleDateString('fr-FR')} à{' '}
                                                            {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    {getStatusBadge(order.status)}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Package className="h-12 w-12 text-gray-900 mx-auto mb-4" />
                                            <p className="text-gray-900 font-medium">Aucune commande récente disponible</p>
                                            <p className="text-sm text-gray-900 mt-2">Créez de nouvelles commandes pour voir les dernières activités ici.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
