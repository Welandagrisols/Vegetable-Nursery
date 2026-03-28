"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { supabase, isDemoMode } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { BulkImportForm } from "./bulk-import-form"
import { BatchStatusManager } from "./batch-status-manager"
import { DemoData } from "./demo-data"
import { Package, FileText, TrendingUp, Database, Upload, Settings, Trash2, Loader2, AlertTriangle } from "lucide-react"

interface InventoryStats {
  totalPlants: number
  currentPlants: number
  futurePlants: number
  totalConsumables: number
  categories: string[]
  healthyPlants?: number; // Added for the new card
  totalValue?: number; // Added for the new card
}

export function OpsTab() {
  const [stats, setStats] = useState<InventoryStats>({
    totalPlants: 0,
    currentPlants: 0,
    futurePlants: 0,
    totalConsumables: 0,
    categories: [],
  })
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const { toast } = useToast()

  const fetchStats = async () => {
    if (isDemoMode) {
      // Use demo data stats
      setStats({
        totalPlants: 63,
        currentPlants: 9,
        futurePlants: 54,
        totalConsumables: 5,
        categories: ["Indigenous Trees", "Fruit Trees", "Ornamental Plants", "Medicinal Plants"],
        healthyPlants: 9, // Demo data for new card
        totalValue: 5000, // Demo data for new card
      })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data: inventory, error } = await supabase.from("inventory").select("*")

      if (error) throw error

      const plants = inventory?.filter((item: any) => !item.category?.startsWith("Consumable:")) || []
      const consumables = inventory?.filter((item: any) => item.category?.startsWith("Consumable:")) || []

      const currentPlants = plants.filter((item: any) => item.ready_for_sale === true)
      const futurePlants = plants.filter((item: any) => item.ready_for_sale === false)

      const categories = [...Array.from(new Set(plants.map((item: any) => item.category).filter(Boolean)))]

      // Calculate healthy plants and total value
      const healthyPlants = plants.filter((item: any) => item.health_status === "Healthy").length;
      const totalValue = plants.reduce((sum: any, item: any) => sum + (item.value || 0), 0);


      setStats({
        totalPlants: plants.length,
        currentPlants: currentPlants.length,
        futurePlants: futurePlants.length,
        totalConsumables: consumables.length,
        categories,
        healthyPlants,
        totalValue,
      })
    } catch (error: any) {
      console.error("Error fetching stats:", error)
      toast({
        title: "Error loading statistics",
        description: error.message || "Failed to load inventory statistics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearAllData = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Cannot clear data in demo mode",
        variant: "destructive",
      })
      return
    }

    setClearing(true)
    try {
      // Clear data in order due to foreign key constraints
      const tables = ["sales", "customers", "inventory", "tasks"]

      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000") // Delete all records

        if (error) {
          console.error(`Error clearing ${table}:`, error)
          // Continue with other tables even if one fails
        }
      }

      toast({
        title: "Data cleared successfully",
        description: "All data has been removed from your database",
      })

      // Refresh stats after clearing
      await fetchStats()
    } catch (error: any) {
      console.error("Error clearing data:", error)
      toast({
        title: "Error clearing data",
        description: error.message || "Failed to clear all data",
        variant: "destructive",
      })
    } finally {
      setClearing(false)
    }
  }

    const handleClearTasks = async () => {
        if (isDemoMode) {
            toast({
                title: "Demo Mode",
                description: "Cannot clear data in demo mode",
                variant: "destructive",
            });
            return;
        }

        setClearing(true);
        try {
            // Clear task consumables first (due to foreign key constraint)
            const { error: consumablesError } = await supabase
                .from("task_consumables")
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (consumablesError) {
                console.error("Error clearing task consumables:", consumablesError);
            }

            // Clear tasks
            const { error: tasksError } = await supabase
                .from("tasks")
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (tasksError) {
                throw tasksError;
            }

            toast({
                title: "Tasks cleared successfully",
                description: "All test tasks have been removed from the system.",
            });

            // Refresh stats after clearing
            await fetchStats();
        } catch (error: any) {
            console.error("Error clearing tasks:", error);
            toast({
                title: "Error clearing tasks",
                description: error.message || "Failed to clear tasks",
                variant: "destructive",
            });
        } finally {
            setClearing(false);
        }
    }

  const handleBulkImportSuccess = () => {
    console.log("Bulk import success callback triggered")
    fetchStats()
    toast({
      title: "Import completed",
      description: "Plants have been imported successfully",
    })
  }

  const handleClearDuplicates = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Cannot clear data in demo mode",
        variant: "destructive",
      })
      return
    }

    setClearing(true)
    try {
      // Fetch all inventory items
      const { data: inventory, error } = await supabase
        .from("inventory")
        .select("*")

      if (error) {
        throw error
      }

      // Group items by plant name (case-insensitive)
      const itemGroups: { [name: string]: any[] } = {};

      inventory?.forEach((item: any) => {
        const name = item.plant_name.toLowerCase().trim();
        if (!itemGroups[name]) {
          itemGroups[name] = [];
        }
        itemGroups[name].push(item);
      });

      // Find groups with duplicates and determine which to keep/delete
      const itemsToDelete: string[] = [];
      let duplicatesFound = 0;

      Object.entries(itemGroups).forEach(([name, items]) => {
        if (items.length > 1) {
          duplicatesFound += items.length - 1;

          // Score each item based on completeness of information
          const scoredItems = items.map(item => {
            let score = 0;

            // Basic fields
            if (item.scientific_name && item.scientific_name.trim()) score += 2;
            if (item.description && item.description.trim()) score += 3;
            if (item.image_url && item.image_url.trim()) score += 3;
            if (item.section && item.section.trim()) score += 1;
            if (item.row && item.row.trim()) score += 1;
            if (item.source && item.source.trim()) score += 1;
            if (item.age && item.age.trim()) score += 1;

            // Prefer items with higher quantities
            if (item.quantity > 0) score += Math.min(item.quantity / 10, 5);

            // Prefer items with cost information
            if (item.batch_cost && item.batch_cost > 0) score += 2;
            if (item.cost_per_seedling && item.cost_per_seedling > 0) score += 1;

            // Prefer items ready for sale
            if (item.ready_for_sale === true) score += 2;

            // Prefer newer items (higher score for more recent)
            if (item.created_at) {
              const daysSinceCreation = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
              score += Math.max(0, 10 - daysSinceCreation / 30); // Newer items get higher score
            }

            return { item, score };
          });

          // Sort by score (highest first) and keep the best one
          scoredItems.sort((a, b) => b.score - a.score);

          // Mark all except the best one for deletion
          for (let i = 1; i < scoredItems.length; i++) {
            itemsToDelete.push(scoredItems[i].item.id);
          }

          console.log(`Duplicate group "${name}":`, {
            total: items.length,
            keeping: scoredItems[0].item.plant_name,
            keepingScore: scoredItems[0].score.toFixed(1),
            deleting: scoredItems.slice(1).map(s => `${s.item.plant_name} (${s.score.toFixed(1)})`),
          });
        }
      });

      if (itemsToDelete.length === 0) {
        toast({
          title: "No duplicates found",
          description: "No duplicate entries were found in your inventory.",
        });
        return;
      }

      // Delete the identified duplicates
      let deletedCount = 0;
      for (const itemId of itemsToDelete) {
        const { error: deleteError } = await supabase
          .from("inventory")
          .delete()
          .eq("id", itemId);

        if (deleteError) {
          console.error("Error deleting duplicate:", deleteError);
        } else {
          deletedCount++;
        }
      }

      toast({
        title: "Duplicates removed successfully",
        description: `Removed ${deletedCount} duplicate entries, keeping the ones with more complete information.`,
      });

      // Refresh stats after clearing
      await fetchStats();
    } catch (error: any) {
      console.error("Error clearing duplicates:", error);
      toast({
        title: "Error clearing duplicates",
        description: error.message || "Failed to clear duplicate data",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold leading-tight">Operations Center</h2>
        <p className="mobile-text-sm text-muted-foreground">Manage bulk operations, imports, and system settings</p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Plants</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-green-600">{loading ? "..." : stats.totalPlants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Consumables</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-green-600">{loading ? "..." : stats.totalConsumables}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">{loading ? "..." : stats.totalPlants + stats.totalConsumables}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">{loading ? "..." : stats.categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Tabs */}
      <Tabs defaultValue="batch-manager" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger 
            value="batch-manager" 
            className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all btn-mobile"
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Batch Manager</span>
            <span className="sm:hidden truncate">Batches</span>
          </TabsTrigger>
          <TabsTrigger 
            value="bulk-import" 
            className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all btn-mobile"
          >
            <Upload className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Bulk Import</span>
            <span className="sm:hidden truncate">Import</span>
          </TabsTrigger>
          <TabsTrigger 
            value="demo-data" 
            className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all btn-mobile"
          >
            <Database className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Demo Data</span>
            <span className="sm:hidden truncate">Demo</span>
          </TabsTrigger>
          <TabsTrigger 
            value="data-management" 
            className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all btn-mobile"
          >
            <Trash2 className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Data Management</span>
            <span className="sm:hidden truncate">Manage</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batch-manager" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Batch Status Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BatchStatusManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Plant Import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BulkImportForm onSuccess={handleBulkImportSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Demo Data Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DemoData onDataChange={fetchStats} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Clear All Data Section */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900 mb-2">Danger Zone</h4>
                    <p className="text-sm text-red-700 mb-4">
                      This will permanently delete all data from your nursery management system including:
                    </p>
                    <ul className="text-sm text-red-700 mb-4 list-disc list-inside space-y-1">
                      <li>All inventory items (plants and consumables)</li>
                      <li>All customer records</li>
                      <li>All sales records</li>
                      <li>All task records</li>
                    </ul>
                    <p className="text-sm text-red-700 mb-4 font-medium">
                      This action cannot be undone. Make sure you have exported any data you want to keep.
                    </p>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={clearing || isDemoMode}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {clearing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Clearing All Data...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Clear All Data
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all data from your database
                            including:
                            <br />
                            <br />• All inventory items (plants and consumables)
                            <br />• All customer records
                            <br />• All sales records
                            <br />• All task records
                            <br />
                            <br />
                            This is useful when you want to clear test data and start fresh with real nursery data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearAllData}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, clear all data
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>

                {/* Remove Duplicates Section */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-medium text-orange-900 mb-2">Remove Duplicate Entries</h4>
                            <p className="text-sm text-orange-700 mb-4">
                                This will remove duplicate entries from your inventory based on plant name.
                            </p>
                            <p className="text-sm text-orange-700 mb-4 font-medium">
                                This action is useful for cleaning up exploratory data entries.
                            </p>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={clearing || isDemoMode}
                                        className="bg-orange-50 hover:bg-orange-100 border-orange-200"
                                    >
                                        {clearing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Removing Duplicates...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remove Duplicates
                                            </>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to remove duplicate entries?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action will remove all duplicate entries based on plant name.
                                            Please ensure you have reviewed your data before proceeding.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleClearDuplicates}
                                            className="bg-orange-600 text-white hover:bg-orange-700"
                                        >
                                            Yes, remove duplicates
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>

                {/* Clear Tasks Section */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-medium text-blue-900 mb-2">Clear Test Tasks</h4>
                            <p className="text-sm text-blue-700 mb-4">
                                This will remove all tasks that are created for testing purposes.
                            </p>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={clearing || isDemoMode}
                                        className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                                    >
                                        {clearing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Clearing Tasks...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Clear All Tasks
                                            </>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to clear all tasks?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action will remove all tasks from the system.
                                            Please ensure you have reviewed your tasks before proceeding.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleClearTasks}
                                            className="bg-blue-600 text-white hover:bg-blue-700"
                                        >
                                            Yes, clear all tasks
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>

              {/* System Information */}
              <div>
                <h4 className="font-medium mb-3">System Information</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Database:</span>
                    <span className={isDemoMode ? "text-yellow-600" : "text-green-600"}>
                      {isDemoMode ? "Demo Mode" : "Connected"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total Records:</span>
                    <span className="font-medium">{stats.totalPlants + stats.totalConsumables}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Categories:</span>
                    <span className="font-medium">{stats.categories.length}</span>
                  </div>
                </div>
              </div>

              {isDemoMode && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 mb-1">Demo Mode Active</h4>
                      <p className="text-sm text-yellow-700">
                        Connect to Supabase to enable full data management features including the ability to clear data.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200/50 shadow-sm">
        <CardHeader className="border-b border-slate-200/50 bg-white/50">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Settings className="h-5 w-5" />
            Quick Actions Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-md">
                  <Settings className="h-4 w-4 text-blue-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Status Management</h4>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Use the Batch Manager to move plants between "In Nursery" and "Future Plans" status. This affects
                website listing and inventory organization.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 rounded-md">
                  <Upload className="h-4 w-4 text-green-600" />
                </div>
                <h4 className="font-semibold text-slate-900">Bulk Operations</h4>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Import multiple plants at once using the Bulk Import feature. Plants are automatically categorized and
                assigned appropriate statuses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}