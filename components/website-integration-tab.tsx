"use client"

import { useState, useEffect } from "react"
import { supabase, isDemoMode, checkTableExists } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/components/ui/use-toast"
import { EditInventoryForm } from "@/components/edit-inventory-form"
import { demoInventory } from "@/components/demo-data"
import { DemoModeBanner } from "@/components/demo-mode-banner"
import { LoadingSpinner } from "@/components/loading-spinner"
import { 
  Globe, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Package, 
  Loader2,
  Droplets,
  School,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Plus,
  AlertCircle,
  ExternalLink
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface WaterSource {
  id: string
  spring_name: string | null
  media_url: string
  media_type: string
  story: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface GreenChampion {
  id: string
  school_name: string | null
  media_url: string
  story: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export function WebsiteIntegrationTab() {
  const [inventory, setInventory] = useState<any[]>([])
  const [waterSources, setWaterSources] = useState<WaterSource[]>([])
  const [greenChampions, setGreenChampions] = useState<GreenChampion[]>([])
  const [loading, setLoading] = useState(true)
  const [greenTownsLoading, setGreenTownsLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All Categories")
  const [statusFilter, setStatusFilter] = useState("all")
  const [editItem, setEditItem] = useState<any>(null)
  const [tableExists, setTableExists] = useState(true)
  const [waterSourcesTableExists, setWaterSourcesTableExists] = useState(false)
  const [greenChampionsTableExists, setGreenChampionsTableExists] = useState(false)
  const [activeTab, setActiveTab] = useState("products")
  const { toast } = useToast()

  useEffect(() => {
    async function init() {
      if (isDemoMode) {
        setInventory(demoInventory)
        setWaterSources([])
        setGreenChampions([])
        setLoading(false)
        setGreenTownsLoading(false)
        return
      }

      const [inventoryExists, waterExists, championsExists] = await Promise.all([
        checkTableExists("inventory"),
        checkTableExists("water_source_gallery"),
        checkTableExists("green_champions_gallery")
      ])

      setTableExists(inventoryExists)
      setWaterSourcesTableExists(waterExists)
      setGreenChampionsTableExists(championsExists)

      if (!inventoryExists) {
        setInventory(demoInventory)
        setLoading(false)
      } else {
        fetchInventory().catch((error) => {
          console.log("Falling back to demo mode due to:", error.message)
          toast({
            title: "Connection Issue",
            description: "Unable to connect to database. Using demo data.",
            variant: "destructive",
          })
          setInventory(demoInventory)
          setLoading(false)
        })
      }

      if (waterExists && championsExists) {
        Promise.all([fetchWaterSources(), fetchGreenChampions()]).catch((error) => {
          console.log("Error loading Green Towns data:", error.message)
          setWaterSources([])
          setGreenChampions([])
          setGreenTownsLoading(false)
        })
      } else {
        setWaterSources([])
        setGreenChampions([])
        setGreenTownsLoading(false)
      }
    }

    init()
  }, [])

  async function fetchInventory() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setInventory(data || [])
    } catch (error: any) {
      console.error("Error fetching inventory:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function fetchWaterSources() {
    try {
      setGreenTownsLoading(true)
      const { data, error } = await supabase
        .from('water_source_gallery')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setWaterSources(data || [])
    } catch (error: any) {
      console.error('Error loading water sources:', error)
      throw error
    } finally {
      setGreenTownsLoading(false)
    }
  }

  async function fetchGreenChampions() {
    try {
      const { data, error } = await supabase
        .from('green_champions_gallery')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setGreenChampions(data || [])
    } catch (error: any) {
      console.error('Error loading green champions:', error)
      throw error
    }
  }

  async function toggleWebsiteListing(itemId: string, currentStatus: boolean) {
    if (isDemoMode || !tableExists) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase to enable website listing management",
        variant: "destructive",
      })
      return
    }

    try {
      setUpdating(itemId)
      const { error } = await (supabase.from("inventory") as any)
        .update({ 
          ready_for_sale: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", itemId)

      if (error) throw error

      toast({
        title: "Success",
        description: `Product ${!currentStatus ? 'listed on' : 'hidden from'} website`,
      })

      await fetchInventory()
    } catch (error: any) {
      console.error("Error updating listing status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update listing status",
        variant: "destructive",
      })
    } finally {
      setUpdating(null)
    }
  }

  async function deleteInventoryItem(id: string) {
    if (isDemoMode || !tableExists) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase to enable deleting items",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("inventory").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Product deleted successfully",
      })

      await fetchInventory()
    } catch (error: any) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  // Filter products that can be listed on website
  const websiteProducts = inventory.filter(item => {
    return !item.category?.startsWith("[Internal]") && 
           item.quantity > 0
  })

  const filteredProducts = websiteProducts.filter((item) => {
    const matchesSearch = 
      item.plant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === "All Categories" || item.category === categoryFilter

    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "listed" && item.ready_for_sale) ||
      (statusFilter === "unlisted" && !item.ready_for_sale)

    return matchesSearch && matchesCategory && matchesStatus
  })

  const categories = [
    "All Categories",
    ...Array.from(new Set(websiteProducts.map(item => item.category).filter(Boolean)))
  ]

  const listedCount = websiteProducts.filter(item => item.ready_for_sale).length
  const unlistedCount = websiteProducts.filter(item => !item.ready_for_sale).length

  const greenTownsStats = {
    waterSources: waterSources.length,
    activeWater: waterSources.filter(s => s.is_active).length,
    greenChampions: greenChampions.length,
    activeChampions: greenChampions.filter(c => c.is_active).length,
  }

  const handleEditWaterSource = (source: WaterSource) => {
    toast({
      title: "Edit Water Source",
      description: "Edit functionality will be implemented",
    })
  }

  const handleDeleteWaterSource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this water source?")) return

    try {
      const { error } = await supabase
        .from('water_source_gallery')
        .delete()
        .eq('id', id)

      if (error) throw error

      setWaterSources(prev => prev.filter(s => s.id !== id))
      toast({
        title: "Success",
        description: "Water source deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting water source:', error)
      toast({
        title: "Error",
        description: "Failed to delete water source",
        variant: "destructive",
      })
    }
  }

  const handleEditGreenChampion = (champion: GreenChampion) => {
    toast({
      title: "Edit Green Champion",
      description: "Edit functionality will be implemented",
    })
  }

  const handleDeleteGreenChampion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this green champion?")) return

    try {
      const { error } = await supabase
        .from('green_champions_gallery')
        .delete()
        .eq('id', id)

      if (error) throw error

      setGreenChampions(prev => prev.filter(c => c.id !== id))
      toast({
        title: "Success",
        description: "Green champion deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting green champion:', error)
      toast({
        title: "Error",
        description: "Failed to delete green champion",
        variant: "destructive",
      })
    }
  }


  return (
    <div className="space-y-6">
      {(isDemoMode || !tableExists) && (
        <div className="p-6 border-b">
          <DemoModeBanner isDemoMode={isDemoMode} connectionStatus={isDemoMode ? 'demo' : 'connected'} />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Website Management
          </h2>
          <p className="text-muted-foreground text-sm">Manage website content</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-auto">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="green-towns" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Green Towns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6 mt-6">

      {/* Products Summary Cards - 2 columns on mobile */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-blue-600">{websiteProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Listed</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-green-600">{listedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Hidden</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">{unlistedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Visibility</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">
              {websiteProducts.length > 0 ? Math.round((listedCount / websiteProducts.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="listed">Listed</SelectItem>
                  <SelectItem value="unlisted">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-8 w-8 animate-pulse mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">
            {searchTerm || categoryFilter !== "All Categories" || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "No products available for website listing"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((item) => (
            <Card key={item.id} className="transition-all hover:shadow-md h-fit max-w-sm mx-auto w-full">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline" className="text-xs truncate max-w-[140px]">
                    {item.category}
                  </Badge>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEditItem(item)} 
                      className="h-7 w-7 p-0"
                      disabled={isDemoMode || !tableExists}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this product?")) {
                          deleteInventoryItem(item.id)
                        }
                      }}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      disabled={isDemoMode || !tableExists}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Product Image */}
                {item.image_url && (
                  <div className="mb-3">
                    <img 
                      src={item.image_url} 
                      alt={item.plant_name}
                      className="w-full h-32 object-cover rounded-md border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-base leading-tight line-clamp-2">{item.plant_name}</h3>
                    {item.scientific_name && (
                      <p className="text-xs text-muted-foreground italic truncate">{item.scientific_name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Stock:</span>
                      <p className="font-medium truncate">{item.quantity}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Price:</span>
                      <p className="font-medium truncate">Ksh {item.price}</p>
                    </div>
                    {item.sku && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">SKU:</span>
                        <p className="font-medium text-xs truncate">{item.sku}</p>
                      </div>
                    )}
                  </div>

                  {/* Website Listing Toggle */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">List on Website</span>
                        {item.ready_for_sale ? (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                            <Eye className="h-3 w-3 mr-1" />
                            Visible
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 border-gray-200">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hidden
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center">
                        {updating === item.id && (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        <Switch
                          checked={item.ready_for_sale || false}
                          onCheckedChange={() => toggleWebsiteListing(item.id, item.ready_for_sale)}
                          disabled={isDemoMode || !tableExists || updating === item.id}
                        />
                      </div>
                    </div>
                  </div>

                  {item.description && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product: {editItem.plant_name}</DialogTitle>
            </DialogHeader>
            <EditInventoryForm
              item={editItem}
              onSuccess={() => {
                setEditItem(null)
                fetchInventory()
              }}
              onCancel={() => setEditItem(null)}
            />
          </DialogContent>
        </Dialog>
      )}
      </TabsContent>

      <TabsContent value="green-towns" className="space-y-6 mt-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Green Towns Initiative</h3>
            <p className="text-muted-foreground text-sm">Water sources and green champions</p>
          </div>

          {/* Green Towns Summary Cards - 2 columns on mobile */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium">Water Sources</CardTitle>
                <Droplets className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold">{greenTownsStats.waterSources}</div>
                <p className="text-xs text-muted-foreground">{greenTownsStats.activeWater} active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium">Green Champions</CardTitle>
                <School className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold">{greenTownsStats.greenChampions}</div>
                <p className="text-xs text-muted-foreground">{greenTownsStats.activeChampions} active</p>
              </CardContent>
            </Card>
          </div>

          {/* Green Towns Category Tabs */}
          <Tabs defaultValue="water" className="w-full">
            <div className="flex flex-col space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="water" className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Water Sources
                </TabsTrigger>
                <TabsTrigger value="champions" className="flex items-center gap-2">
                  <School className="h-4 w-4" />
                  Green Champions
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="water" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-100 text-blue-800">
                  {waterSources.length} water sources
                </Badge>
                <Button size="sm" disabled={isDemoMode || !waterSourcesTableExists}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Water Source
                </Button>
              </div>
              <GalleryList 
                items={waterSources}
                type="water"
                isDemo={isDemoMode || !waterSourcesTableExists}
                onEditWaterSource={handleEditWaterSource}
                onDeleteWaterSource={handleDeleteWaterSource}
                onEditGreenChampion={handleEditGreenChampion}
                onDeleteGreenChampion={handleDeleteGreenChampion}
              />
            </TabsContent>

            <TabsContent value="champions" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-green-100 text-green-800">
                  {greenChampions.length} schools
                </Badge>
                <Button size="sm" disabled={isDemoMode || !greenChampionsTableExists}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Green Champion
                </Button>
              </div>
              <GreenChampionsAccordion 
                items={greenChampions}
                isDemo={isDemoMode || !greenChampionsTableExists}
                onEdit={handleEditGreenChampion}
                onDelete={handleDeleteGreenChampion}
              />
            </TabsContent>
          </Tabs>
        </div>
      </TabsContent>
      </Tabs>
    </div>
  )
}

interface GalleryListProps {
  items: (WaterSource | GreenChampion)[]
  type: 'water' | 'champion'
  isDemo: boolean
  onEditWaterSource: (source: WaterSource) => void
  onDeleteWaterSource: (id: string) => void
  onEditGreenChampion: (champion: GreenChampion) => void
  onDeleteGreenChampion: (id: string) => void
}

function GalleryList({
  items,
  type,
  isDemo,
  onEditWaterSource,
  onDeleteWaterSource,
  onEditGreenChampion,
  onDeleteGreenChampion,
}: GalleryListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">No items yet</h3>
            <p className="text-muted-foreground text-sm">
              {type === 'water' ? 'Add water sources to showcase' : 'Add green champion schools'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Media */}
              <div className="relative">
                <img 
                  src={item.media_url} 
                  alt={'spring_name' in item ? item.spring_name || 'Water source' : item.school_name || 'School'}
                  className="w-full h-40 object-cover rounded-md"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.jpg';
                  }}
                />
                <Badge 
                  variant={item.is_active ? "default" : "secondary"}
                  className="absolute top-2 right-2"
                >
                  {item.is_active ? "Active" : "Hidden"}
                </Badge>
              </div>

              {/* Title */}
              <div>
                <h3 className="font-semibold text-base">
                  {'spring_name' in item ? item.spring_name : item.school_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Order: {item.display_order}
                </p>
              </div>

              {/* Story */}
              {item.story && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.story}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (type === 'water') {
                      onEditWaterSource(item as WaterSource)
                    } else {
                      onEditGreenChampion(item as GreenChampion)
                    }
                  }}
                  disabled={isDemo}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (type === 'water') {
                      onDeleteWaterSource(item.id)
                    } else {
                      onDeleteGreenChampion(item.id)
                    }
                  }}
                  className="text-destructive hover:text-destructive"
                  disabled={isDemo}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface GreenChampionsAccordionProps {
  items: GreenChampion[]
  isDemo: boolean
  onEdit: (champion: GreenChampion) => void
  onDelete: (id: string) => void
}

function GreenChampionsAccordion({ items, isDemo, onEdit, onDelete }: GreenChampionsAccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>([])

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">No schools yet</h3>
            <p className="text-muted-foreground text-sm">
              Add green champion schools to showcase
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  return (
    <div className="space-y-3">
      {items.map((champion) => (
        <Collapsible
          key={champion.id}
          open={openItems.includes(champion.id)}
          onOpenChange={() => toggleItem(champion.id)}
        >
          <Card className="bg-green-50 border-green-200">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer hover:bg-green-100 transition-colors">
                <div className="flex items-center gap-3">
                  <School className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-green-900">{champion.school_name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={champion.is_active ? "default" : "secondary"} className="bg-green-600">
                    {champion.is_active ? "Active" : "Hidden"}
                  </Badge>
                  {openItems.includes(champion.id) ? (
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="p-4 pt-0 space-y-4">
                {/* Story Text */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {champion.story || "We are preparing detailed information about the impact created with students and the community."}
                  </p>
                </div>

                {/* Media Attachments */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Media Attachments:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {champion.media_url && (
                      <div className="relative group">
                        <img 
                          src={champion.media_url} 
                          alt={`${champion.school_name} media 1`}
                          className="w-full h-32 object-cover rounded-md border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.jpg';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-md" />
                      </div>
                    )}
                    <div className="relative group">
                      <img 
                        src="/placeholder.jpg" 
                        alt={`${champion.school_name} media 2`}
                        className="w-full h-32 object-cover rounded-md border border-gray-200"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-md" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-green-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(champion)
                    }}
                    disabled={isDemo}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(champion.id)
                    }}
                    className="text-destructive hover:text-destructive"
                    disabled={isDemo}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  )
}