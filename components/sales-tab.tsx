"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode, checkTableExists } from "@/lib/supabase"

interface SaleData {
  id: string
  sale_date: string
  quantity: number
  total_amount: number
  inventory_id: string
  customer_id?: string
  inventory?: {
    plant_name: string
    category: string
    price: number
  }
  customer?: {
    name: string
    contact: string
  }
}
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AddSaleForm } from "@/components/add-sale-form"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { demoSales } from "@/components/demo-data"
import { DemoModeBanner } from "@/components/demo-mode-banner"
import { exportToExcel, formatSalesForExport } from "@/lib/excel-export"
import { Download, Loader2, Trash2, Package } from "lucide-react"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return isMobile
}

export function SalesTab() {
  const [sales, setSales] = useState<SaleData[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [totalSales, setTotalSales] = useState(0)
  const [totalSeedlings, setTotalSeedlings] = useState(0)
  const [tableExists, setTableExists] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()
  const isMobile = useIsMobile()

  useEffect(() => {
    async function init() {
      if (isDemoMode) {
        console.log("In demo mode, loading demo sales")
        loadDemoSales()
        return
      }

      const exists = await checkTableExists("sales")
      console.log("Sales table exists:", exists)
      setTableExists(exists)

      if (!exists) {
        console.log("Sales table does not exist, loading demo data")
        loadDemoSales()
        return
      }

      fetchSales().catch((error) => {
        console.log("Falling back to demo mode due to:", error.message)
        loadDemoSales()
      })
    }

    init()
  }, [])

  function loadDemoSales() {
    setSales(demoSales)

    let salesTotal = 0
    let seedlingsTotal = 0

    demoSales.forEach((sale) => {
      salesTotal += sale.total_amount
      seedlingsTotal += sale.quantity
    })

    setTotalSales(salesTotal)
    setTotalSeedlings(seedlingsTotal)
    setLoading(false)
  }

  async function fetchSales() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          inventory:inventory_id (plant_name, category, price),
          customer:customer_id (name, contact)
        `)
        .order("sale_date", { ascending: false })

      if (error) throw error

      setSales(data || [])

      let salesTotal = 0
      let seedlingsTotal = 0

      data?.forEach((sale: any) => {
        salesTotal += sale.total_amount
        seedlingsTotal += sale.quantity
      })

      setTotalSales(salesTotal)
      setTotalSeedlings(seedlingsTotal)
    } catch (error: any) {
      console.error("Error fetching sales:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleAddSaleSuccess = async () => {
    console.log("handleAddSaleSuccess called")
    try {
      await fetchSales()
      setDialogOpen(false)
    } catch (error) {
      console.error("Error refreshing sales:", error)
    }
  }

  const handleExportToExcel = async () => {
    try {
      setExporting(true)

      const exportData = formatSalesForExport(sales)

      const success = exportToExcel(exportData, `Sales_Export_${new Date().toISOString().split("T")[0]}`)

      if (success) {
        toast({
          title: "Export Successful",
          description: `${exportData.length} sales records exported to Excel`,
        })
      } else {
        throw new Error("Export failed")
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "An error occurred during export",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteSale = async (saleId: string) => {
    if (isDemoMode || !tableExists) {
      toast({
        title: "Cannot Delete",
        description: "Connect to Supabase to enable deleting sales",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase.rpc("delete_sale_atomic", { p_sale_id: saleId })
      if (error) throw error
      if (!data?.success) throw new Error(data?.message || "Failed to delete sale")

      toast({
        title: "Sale Deleted",
        description: "Sale record has been deleted successfully",
      })

      // Refresh the sales data
      await fetchSales()
    } catch (error: any) {
      console.error("Error deleting sale:", error)
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete sale",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="modern-page space-y-8">
      {(isDemoMode || !tableExists) && (
        <DemoModeBanner 
          isDemoMode={isDemoMode} 
          connectionStatus={isDemoMode ? 'demo' : (!tableExists ? 'connecting' : 'connected')} 
        />
      )}

      {/* Modern Header */}
      <div className="modern-header">
        <h1 className="modern-title">Sales Management</h1>
        <p className="modern-subtitle">Track your sales performance and revenue</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-blue-600">Ksh {totalSales.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-green-600">{totalSeedlings.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">
              {
                sales.filter((sale) => {
                  const saleDate = new Date(sale.sale_date)
                  const now = new Date()
                  return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()
                }).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Avg Per Sale</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">
              Ksh {sales.length > 0 ? Math.round(totalSales / sales.length).toLocaleString() : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Sales Table */}
      <Card className="modern-card">
        <CardHeader className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Sales Records</CardTitle>
              <p className="text-muted-foreground mt-2">Track and manage all sales transactions</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Button
                variant="outline"
                className="modern-button flex items-center justify-center gap-2"
                onClick={handleExportToExcel}
                disabled={exporting || sales.length === 0}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export to Excel
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="modern-button bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                    disabled={loading || isDemoMode || !tableExists}
                    onClick={() => {
                      console.log("Record New Sale button clicked")
                      console.log("Button state - isDemoMode:", isDemoMode, "tableExists:", tableExists)
                      setDialogOpen(true)
                    }}
                  >
                    + Add Sale
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] m-2">
                  <DialogHeader>
                    <DialogTitle>Record New Sale</DialogTitle>
                  </DialogHeader>
                  <AddSaleForm onSuccess={handleAddSaleSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            {loading ? (
              <div className="text-center py-8 px-3">
                <p className="mobile-text-sm text-muted-foreground">Loading sales records...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-8 px-3">
                <p className="mobile-text-sm text-muted-foreground">No sales records found</p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {sales.map((sale) => (
                  <Card key={sale.id} className="p-3 border border-border hover:bg-muted/30">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="mobile-text-sm font-medium truncate">{sale.inventory?.plant_name || "Unknown Plant"}</p>
                          <p className="text-xs text-muted-foreground">{sale.inventory?.category || ""}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="mobile-text-sm font-bold text-green-600">Ksh {sale.total_amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{sale.quantity} units</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{new Date(sale.sale_date).toLocaleDateString()}</span>
                        <span className="truncate max-w-[120px]">
                          {sale.customer ? sale.customer.name : "Walk-in"}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSale(sale.id)}
                          disabled={isDemoMode || !tableExists}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm px-2 sm:px-4">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm px-2 sm:px-4">Plant</TableHead>
                  <TableHead className="text-xs sm:text-sm px-2 sm:px-4">Quantity</TableHead>
                  <TableHead className="text-xs sm:text-sm px-2 sm:px-4">Amount</TableHead>
                  <TableHead className="text-xs sm:text-sm px-2 sm:px-4">Customer</TableHead>
                  <TableHead className="text-xs sm:text-sm px-2 sm:px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm">
                      Loading sales records...
                    </TableCell>
                  </TableRow>
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm">
                      No sales records found
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">
                        <div className="font-medium">{sale.inventory?.plant_name || "Unknown Plant"}</div>
                        <div className="text-xs text-muted-foreground">{sale.inventory?.category || ""}</div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">{sale.quantity}</TableCell>
                      <TableCell className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3 font-semibold text-green-600">
                        Ksh {sale.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">
                        {sale.customer ? (
                          <>
                            <div className="font-medium">{sale.customer.name}</div>
                            <div className="text-xs text-muted-foreground">{sale.customer.contact}</div>
                          </>
                        ) : (
                          "Walk-in Customer"
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSale(sale.id)}
                          disabled={isDemoMode || !tableExists}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}