// app/dashboard/orders/[id]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
    Package, DollarSign, MapPin, Phone, Mail, Calendar, ArrowLeft,
    Truck, CheckCircle, Clock, XCircle, RefreshCw,
    Link,
    CreditCard,
    FileText
} from "lucide-react"
import { DashboardHeader } from "@/components/header"
import Image from "next/image"

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
    paymentMethod: string
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

export default function OrderDetailsPage() {
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [formData, setFormData] = useState<Partial<Order>>({})
    const params = useParams()
    const router = useRouter()

    useEffect(() => {
        fetchOrder()
    }, [params.id])

    const fetchOrder = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/${params.id}`)
            const data = await response.json()
            setOrder(data)
            setFormData(data)
        } catch (error) {
            console.error("Error fetching order:", error)
        } finally {
            setLoading(false)
        }
    }

    const updateOrder = async () => {
        setUpdating(true)
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                fetchOrder()
            }
        } catch (error) {
            console.error("Error updating order:", error)
        } finally {
            setUpdating(false)
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <DashboardHeader />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-900 font-medium">Chargement de la commande...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50">
                <DashboardHeader />
                <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
                    <Button asChild className="mb-8 gap-2">
                        <Link href="/dashboard">
                            <ArrowLeft className="h-4 w-4" />
                            Retour au tableau de bord
                        </Link>
                    </Button>
                    <Card className="bg-white border-gray-200">
                        <CardContent className="p-6 text-center">
                            <p className="text-xl font-semibold text-gray-900">Commande non trouvée</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardHeader />

            <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Commande {order.orderNumber}</h1>
                        <p className="text-gray-900 mt-2">Gérez les détails de la commande</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => router.back()} variant="outline" className="gap-2 bg-white border-gray-300 text-gray-900 hover:bg-gray-100">
                            <ArrowLeft className="h-4 w-4" />
                            Retour
                        </Button>
                        <Button onClick={fetchOrder} variant="outline" className="gap-2 bg-white border-gray-300 text-gray-900 hover:bg-gray-100">
                            <RefreshCw className="h-4 w-4" />
                            Actualiser
                        </Button>
                    </div>
                </div>

                {/* Overview Card */}
                <Card className="bg-white border-gray-200 mb-6">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-lg">
                                    <Package className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Statut</p>
                                    {getStatusBadge(order.status)}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Total</p>
                                <p className="text-2xl font-bold text-gray-900">{order.orderSummary.totalPrice.toFixed(2)} TND</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
                        <TabsTrigger
                            value="details"
                            className="text-gray-900 data-[state=active]:bg-gray-900 data-[state=active]:text-white font-medium"
                        >
                            Détails
                        </TabsTrigger>
                        <TabsTrigger
                            value="client"
                            className="text-gray-900 data-[state=active]:bg-gray-900 data-[state=active]:text-white font-medium"
                        >
                            Client
                        </TabsTrigger>
                        <TabsTrigger
                            value="produits"
                            className="text-gray-900 data-[state=active]:bg-gray-900 data-[state=active]:text-white font-medium"
                        >
                            Produits
                        </TabsTrigger>
                        <TabsTrigger
                            value="financier"
                            className="text-gray-900 data-[state=active]:bg-gray-900 data-[state=active]:text-white font-medium"
                        >
                            Financier
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-6">
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-900">Détails de la Commande</CardTitle>
                                <CardDescription className="text-gray-900">Informations générales</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <Calendar className="h-5 w-5 text-gray-900" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Date de Commande</p>
                                        <p className="text-gray-900">{new Date(order.orderDate).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Truck className="h-5 w-5 text-gray-900" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Livraison Estimée</p>
                                        <p className="text-gray-900">{new Date(order.deliveryInfo.estimatedDelivery).toLocaleString('fr-FR', { dateStyle: 'long' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <CreditCard className="h-5 w-5 text-gray-900" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Méthode de Paiement</p>
                                        <p className="text-gray-900">{order.paymentMethod.replace('_', ' ').toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Mail className="h-5 w-5 text-gray-900" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Email Envoyé</p>
                                        <p className="text-gray-900">{order.emailSent ? 'Oui' : 'Non'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Clock className="h-5 w-5 text-gray-900" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Dernière Mise à Jour</p>
                                        <p className="text-gray-900">{new Date(order.updatedAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-gray-900" />
                                        <p className="text-sm font-semibold text-gray-900">Note</p>
                                    </div>
                                    <Textarea
                                        value={formData.note || ''}
                                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                        placeholder="Ajoutez une note après l'appel de confirmation..."
                                        className="min-h-[100px] text-gray-900 bg-white border-gray-300"
                                    />
                                    <Button 
                                        onClick={updateOrder} 
                                        disabled={updating}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        {updating ? 'Enregistrement...' : 'Enregistrer la note'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="client" className="mt-6">
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-900">Informations Client</CardTitle>
                                <CardDescription className="text-gray-900">Détails du client et adresse de livraison</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <Package className="h-5 w-5 text-gray-900" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Nom Complet</p>
                                        <p className="text-gray-900">{order.customer.fullName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Mail className="h-5 w-5 text-gray-900" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Email</p>
                                        <p className="text-gray-900">{order.customer.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Phone className="h-5 w-5 text-gray-900" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Téléphone</p>
                                        <p className="text-gray-900">{order.customer.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <MapPin className="h-5 w-5 text-gray-900" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Adresse</p>
                                        <p className="text-gray-900">{order.customer.address}, {order.customer.city} {order.customer.postalCode}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="produits" className="mt-6">
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-900">Produits Commandés</CardTitle>
                                <CardDescription className="text-gray-900">
                                    {order.orderSummary.totalItems} articles au total
                                    {order.orderSummary.totalItems >= 3 && (
                                        <span className="text-emerald-600 font-medium ml-2">
                                            (+ 1 produit gratuit)
                                        </span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {order.products.map((product, index) => (
                                        <div key={index} className="flex items-center gap-4 border-b border-gray-200 pb-4 last:border-0 last:pb-0">

                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">{product.name}</p>
                                                <p className="text-sm text-gray-900">Quantité: {product.quantity}</p>
                                                <p className="text-sm text-gray-900">Prix: {product.price.toFixed(2)} TND</p>
                                            </div>
                                            <p className="text-right font-semibold text-gray-900">{product.subtotal.toFixed(2)} TND</p>
                                        </div>
                                    ))}
                                    {order.orderSummary.totalItems >= 3 && (
                                        <div className="flex items-center gap-4 border-t border-emerald-200 pt-4 bg-emerald-50 rounded-lg p-4">
                                            <div className="flex-1">
                                                <p className="font-semibold text-emerald-700">Produit Gratuit</p>
                                                <p className="text-sm text-emerald-600">Offert pour commande de 3+ produits</p>
                                            </div>
                                            <p className="text-right font-semibold text-emerald-700">Gratuit</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="financier" className="mt-6">
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-900">Résumé Financier</CardTitle>
                                <CardDescription className="text-gray-900">Détails des coûts</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <p className="text-gray-900">Total Produits</p>
                                    <p className="text-gray-900">{order.orderSummary.productsTotal.toFixed(2)} TND</p>
                                </div>
                                <div className="flex justify-between">
                                    <p className="text-gray-900">Frais de Livraison</p>
                                    <p className="text-gray-900">{order.orderSummary.deliveryFee.toFixed(2)} TND</p>
                                </div>
                                {(() => {
                                    const DELIVERY_FEE = 8 // Shipping cost in TND
                                    const PRODUCT_COST = 6 // Cost per product unit in TND
                                    const FREE_PRODUCT_COST = 6 // Cost of free product
                                    
                                    // Calculate free products: 1 free product for orders with 3+ products
                                    const freeProductQuantity = order.orderSummary.totalItems >= 3 ? 1 : 0
                                    
                                    // Revenue = totalPrice - shipping
                                    const revenue = order.orderSummary.totalPrice - DELIVERY_FEE
                                    
                                    // Profit calculation
                                    const numberOfProducts = order.orderSummary.totalItems
                                    const productCosts = numberOfProducts * PRODUCT_COST
                                    const freeProductCost = freeProductQuantity > 0 ? FREE_PRODUCT_COST : 0
                                    const onePercentDeduction = revenue * 0.01
                                    const profit = revenue - productCosts - freeProductCost - onePercentDeduction
                                    
                                    return (
                                        <>
                                            {freeProductQuantity > 0 && (
                                                <div className="flex justify-between text-emerald-600">
                                                    <p className="font-medium">Produits Gratuits</p>
                                                    <p className="font-medium">{freeProductQuantity} produit(s)</p>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-semibold text-gray-900 pt-4 border-t">
                                                <p>Total Commande</p>
                                                <p>{order.orderSummary.totalPrice.toFixed(2)} TND</p>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-600 pt-2">
                                                <p>Moins: Frais de Livraison</p>
                                                <p>-{DELIVERY_FEE.toFixed(2)} TND</p>
                                            </div>
                                            <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                                                <p>Revenu</p>
                                                <p>{revenue.toFixed(2)} TND</p>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-600 pt-2">
                                                <p>Moins: Coût Produits ({numberOfProducts} × {PRODUCT_COST} TND)</p>
                                                <p>-{productCosts.toFixed(2)} TND</p>
                                            </div>
                                            {freeProductCost > 0 && (
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <p>Moins: Produit Gratuit</p>
                                                    <p>-{freeProductCost.toFixed(2)} TND</p>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <p>Moins: 1% du Revenu</p>
                                                <p>-{onePercentDeduction.toFixed(2)} TND</p>
                                            </div>
                                            <div className="flex justify-between font-semibold text-emerald-600 pt-2 border-t">
                                                <p>Profit Net</p>
                                                <p>{profit.toFixed(2)} TND</p>
                                            </div>
                                        </>
                                    )
                                })()}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}