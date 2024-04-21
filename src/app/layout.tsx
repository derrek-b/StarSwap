import type { Metadata } from "next"
import 'bootstrap/dist/css/bootstrap.min.css'
import "./globals.css"

export const metadata: Metadata = {
  title: "Mos Eisley",
  description: "Galia's wretched hive of scum and villiany",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="mx-5">{children}</body>
    </html>
  )
}
