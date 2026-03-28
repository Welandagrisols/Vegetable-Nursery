"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode, checkTableExists } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2, TrendingUp, TrendingDown, Minus, Package } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DemoModeBanner } from "./demo-mode-banner"
import { exportToExcel } from "@/lib/excel-export"

// Demo data for reports
const demoReportsData = [
  {
    batch_sku: "MAN01",
    plant_name: "Mango",
    category: "Fruit Trees",
    quantity: 50,
    selling_price: 150,
    total_batch_cost: 2500,
    total_task_costs: 3250,
    total_cost_per_seedling: 115,
    profit_per_seedling: 35,
    profit_margin: 23.3,
    total_batch_value: 7500,
    total_batch_profit: 1750,
    seedlings_sold: 15,
    revenue_generated: 2250,
    profit_realized: 525,
  },
  {
    batch_sku: "AVA01",
    plant_name: "Avocado",
    category: "Fruit Trees",
    quantity: 30,
    selling_price: 200,
    total_batch_cost: 1800,
    total_task_costs: 2100,
    total_cost_per_seedling: 130,
    profit_per_seedling: 70,
    profit_margin: 35.0,
    total_batch_value: 6000,
    total_batch_profit: 2100,
    seedlings_sold: 12,
    revenue_generated: 2400,
    profit_realized: 840,
  },
  {
    batch_sku: "BLU01",
    plant_name: "Blue Gum",
    category: "Timber Trees",
    quantity: 100,
    selling_price: 80,
    total_batch_cost: 3000,
    total_task_costs: 2500,
    total_cost_per_seedling: 55,
    profit_per_seedling: 25,
    profit_margin: 31.3,
    total_batch_value: 8000,
    total_batch_profit: 2500,
    seedlings_sold: 25,
    revenue_generated: 2000,
    profit_realized: 625,
  },
]

export function ReportsTab() {
  const [profitabilityData, setProfitabilityData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [tablesExist, setTablesExist] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchProfitabilityData()
  }, [])

  async function fetchProfitabilityData() {
    if (isDemoMode) {
      setProfitabilityData(demoReportsData)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Check if required tables exist
      const [inventoryExists, tasksExists, salesExists] = await Promise.all([
        checkTableExists("inventory"),
        checkTableExists("tasks"),
        checkTableExists("sales"),
      ])

      if (!inventoryExists || !tasksExists || !salesExists) {
        setTablesExist(false)
        setProfitabilityData(demoReportsData)
        setLoading(false)
        return
      }

      // Fetch inventory data with cost tracking
      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("*")
        .neq("item_type", "Consumable")

      if (inventoryError) throw inventoryError

      // Fetch task costs grouped by batch SKU
      const { data: taskCosts, error: taskError } = await supabase
        .from("tasks")
        .select("batch_sku, total_cost")

      if (taskError) throw taskError

      // Fetch sales data
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select(`
          *,
          inventory:inventory_id (sku, plant_name, price)
        `)

      if (salesError) throw salesError

      // Calculate profitability for each batch
      const profitabilityMap = new Map()

      inventory?.forEach((item: any) => {
        const batchSku = item.sku
        const batchCost = item.batch_cost || 0
        const taskCostsForBatch = taskCosts
          ?.filter((task: any) => task.batch_sku === batchSku)
          .reduce((sum: any, task: any) => sum + (task.total_cost || 0), 0) || 0

        const openingQuantity = item.opening_quantity || item.quantity || 0
        const totalCostPerSeedling = openingQuantity > 0 
          ? (batchCost + taskCostsForBatch) / openingQuantity 
          : 0

        const profitPerSeedling = item.price - totalCostPerSeedling
        const profitMargin = item.price > 0 ? (profitPerSeedling / item.price) * 100 : 0

        // Calculate sales data for this batch
        const batchSales = sales?.filter((sale: any) => sale.inventory?.sku === batchSku) || []
        const seedlingsSold = batchSales.reduce((sum: any, sale: any) => sum + sale.quantity, 0)
        const revenueGenerated = batchSales.reduce((sum: any, sale: any) => sum + sale.total_amount, 0)
        const profitRealized = seedlingsSold * profitPerSeedling

        profitabilityMap.set(batchSku, {
          batch_sku: batchSku,
          plant_name: item.plant_name,
          category: item.category,
          quantity: item.quantity,
          opening_quantity: openingQuantity,
          selling_price: item.price,
          total_batch_cost: batchCost,
          total_task_costs: taskCostsForBatch,
          total_cost_per_seedling: totalCostPerSeedling,
          profit_per_seedling: profitPerSeedling,
          profit_margin: profitMargin,
          total_batch_value: openingQuantity * item.price,
          total_batch_profit: openingQuantity * profitPerSeedling,
          seedlings_sold: seedlingsSold,
          revenue_generated: revenueGenerated,
          profit_realized: profitRealized,
        })
      })

      // Convert to array and sort by profit margin (highest first)
      const profitabilityArray = Array.from(profitabilityMap.values())
        .sort((a, b) => b.profit_margin - a.profit_margin)

      setProfitabilityData(profitabilityArray)
    } catch (error: any) {
      console.error("Error fetching profitability data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch profitability data. Using demo data.",
        variant: "destructive",
      })
      setProfitabilityData(demoReportsData)
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = async () => {
    try {
      setExporting(true)

      const exportData = profitabilityData.map((item) => ({
        "Batch SKU": item.batch_sku,
        "Plant Name": item.plant_name,
        Category: item.category,
        "Quantity in Batch": item.quantity,
        "Selling Price per Seedling (Ksh)": item.selling_price,
        "Initial Batch Cost (Ksh)": item.total_batch_cost,
        "Task Costs (Ksh)": item.total_task_costs,
        "Total Cost per Seedling (Ksh)": Math.round(item.total_cost_per_seedling * 100) / 100,
        "Profit per Seedling (Ksh)": Math.round(item.profit_per_seedling * 100) / 100,
        "Profit Margin (%)": Math.round(item.profit_margin * 100) / 100,
        "Total Batch Value (Ksh)": item.total_batch_value,
        "Potential Batch Profit (Ksh)": Math.round(item.total_batch_profit * 100) / 100,
        "Seedlings Sold": item.seedlings_sold,
        "Revenue Generated (Ksh)": item.revenue_generated,
        "Profit Realized (Ksh)": Math.round(item.profit_realized * 100) / 100,
      }))

      const success = exportToExcel(exportData, `Profitability_Report_${new Date().toISOString().split("T")[0]}`)

      if (success) {
        toast({
          title: "Export Successful",
          description: `${exportData.length} profit records exported to Excel`,
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

  // Calculate summary metrics
  const totalBatches = profitabilityData.length
  const totalRevenue = profitabilityData.reduce((sum, item) => sum + item.revenue_generated, 0)
  const totalProfit = profitabilityData.reduce((sum, item) => sum + item.profit_realized, 0)
  const averageProfitMargin = totalBatches > 0 
    ? profitabilityData.reduce((sum, item) => sum + item.profit_margin, 0) / totalBatches 
    : 0

  const getProfitTrendIcon = (margin: number) => {
    if (margin > 25) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (margin > 10) return <Minus className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const getProfitBadgeVariant = (margin: number) => {
    if (margin > 25) return "default"
    if (margin > 10) return "secondary"
    return "destructive"
  }

  return (
    <div className="space-y-6">
      {(isDemoMode || !tablesExist) && (
        <DemoModeBanner isDemoMode={isDemoMode} connectionStatus={tablesExist ? 'connected' : 'demo'} />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-green-600">{totalBatches}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">Ksh {totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">Ksh {totalProfit.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">{averageProfitMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={handleExportToExcel}
          disabled={exporting || profitabilityData.length === 0}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export to Excel
        </Button>
      </div>

      {/* Profitability Table */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading profitability data...</div>
          ) : profitabilityData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No profitability data available. Add inventory and tasks to see reports.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-xs">#</TableHead>
                  <TableHead className="">Plant & Batch</TableHead>
                  <TableHead className="hidden sm:table-cell">Performance</TableHead>
                  <TableHead className="hidden lg:table-cell">Sales Data</TableHead>
                  <TableHead className="">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitabilityData.map((item, index) => (
                  <TableRow key={item.batch_sku} className="hover:bg-muted/50">
                    <TableCell className="font-bold text-primary text-xs w-8">{index + 1}</TableCell>
                    <TableCell className="">
                      <div className="space-y-1">
                        <div className="font-medium text-sm truncate">{item.plant_name}</div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="font-mono text-xs truncate max-w-[60px] sm:max-w-none">
                            {item.batch_sku}
                          </Badge>
                          <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                            {item.category}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </div>
                        <div className="sm:hidden text-xs space-y-1">
                          <Badge variant={getProfitBadgeVariant(item.profit_margin)} className="text-xs">
                            {getProfitTrendIcon(item.profit_margin)}
                            {item.profit_margin.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="space-y-1">
                        <Badge variant={getProfitBadgeVariant(item.profit_margin)} className="text-xs">
                          {getProfitTrendIcon(item.profit_margin)}
                          {item.profit_margin.toFixed(1)}%
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Cost: Ksh {Math.round(item.total_cost_per_seedling)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm space-y-1">
                        <div className="font-medium">Ksh {item.revenue_generated.toLocaleString()}</div>
                        <div className="text-muted-foreground text-xs">
                          {item.seedlings_sold} sold
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="">
                      <div className="space-y-1">
                        <div className="font-bold text-accent text-sm">
                          Ksh {Math.round(item.profit_realized).toLocaleString()}
                        </div>
                        <div className="lg:hidden text-xs text-muted-foreground">
                          Rev: Ksh {item.revenue_generated.toLocaleString()}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}