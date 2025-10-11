import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"



export const metadata: Metadata = {
  title: "Planti Dashboard - Gestion des Commandes",
  description: "Tableau de bord pour la gestion des commandes Planti",
  keywords: "dashboard, commandes, plantes, gestion, Tunisie",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={` bg-gray-50`}>
        {children}
      </body>
    </html>
  )
}